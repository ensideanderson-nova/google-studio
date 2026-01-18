
import React, { useState, useEffect, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell, LineChart, Line } from 'recharts';
import { BUSINESS_DATA, MAPPED_SYSTEMS } from '../constants';
import { SystemLog, SystemEvent, SheetContact } from '../types';
import { getEvolutionConfig } from '../services/evolutionService';
import { 
  fetchRedisMemoryMetrics, 
  getLiveRedisMemoryUpdate, 
  RedisMemoryPoint, 
  fetchRedisClientsMetrics, 
  getLiveRedisClientsUpdate, 
  RedisClientPoint,
  fetchRedisOpsMetrics,
  getLiveRedisOpsUpdate,
  RedisOpsPoint,
  fetchRedisSystemInfo,
  RedisSystemInfo
} from '../services/metricsService';

const learningData = [
  { name: '08:00', value: 37210 },
  { name: '10:00', value: 37220 },
  { name: '12:00', value: 37228 },
  { name: '14:00', value: 37235 },
  { name: '16:00', value: 37242 },
];

interface DashboardProps {
  learnedCount: number;
  logs: SystemLog[];
  events: SystemEvent[];
  contacts: SheetContact[];
  isSheetsLoading: boolean;
}

const CustomTooltip = ({ active, payload, label, unit }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-950 border border-emerald-500/50 p-4 rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.2)] backdrop-blur-xl ring-1 ring-white/10">
        <p className="text-[10px] font-black text-slate-500 mb-3 uppercase tracking-[0.2em]">{label} (METRIC-LIVE)</p>
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-8">
            <div className="flex items-center gap-2">
              <div className={`w-1.5 h-1.5 rounded-full ${payload[0].color || 'bg-emerald-500'}`}></div>
              <span className="text-[10px] font-bold text-slate-400 uppercase">{payload[0].name}</span>
            </div>
            <span className={`text-xs font-mono font-black ${payload[0].color ? 'text-blue-400' : 'text-emerald-400'}`}>
              {payload[0].value.toFixed(0)} {unit}
            </span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

const Dashboard: React.FC<DashboardProps> = ({ learnedCount, logs, events, contacts, isSheetsLoading }) => {
  const [redisMemoryData, setRedisMemoryData] = useState<RedisMemoryPoint[]>([]);
  const [redisClientsData, setRedisClientsData] = useState<RedisClientPoint[]>([]);
  const [redisOpsData, setRedisOpsData] = useState<RedisOpsPoint[]>([]);
  const [redisInfo, setRedisInfo] = useState<RedisSystemInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentUsage, setCurrentUsage] = useState(0);
  const [currentClients, setCurrentClients] = useState(0);
  const [currentOps, setCurrentOps] = useState(0);
  const [timeRange, setTimeRange] = useState<'1h' | '6h' | '24h'>('24h');

  // Evolution Config for reference
  const evoConfig = getEvolutionConfig();

  // Event Feed Filtering & Sorting State
  const [eventSearch, setEventSearch] = useState('');
  const [eventTypeFilter, setEventTypeFilter] = useState<'ALL' | 'SYNC' | 'EXECUTION' | 'SYSTEM'>('ALL');
  const [eventSortOrder, setEventSortOrder] = useState<'NEWEST' | 'OLDEST'>('NEWEST');

  // Real data calculations
  const supplierCount = contacts.filter(c => c.categoria === 'FORNECEDOR').length;
  const clientCount = contacts.filter(c => c.categoria === 'CLIENTE').length;
  const transportCount = contacts.filter(c => c.categoria === 'TRANSPORTADOR').length;
  const totalContacts = contacts.length;

  const loadMetrics = async () => {
    setLoading(true);
    try {
      const [memoryData, clientsData, opsData, info] = await Promise.all([
        fetchRedisMemoryMetrics(timeRange),
        fetchRedisClientsMetrics(timeRange),
        fetchRedisOpsMetrics(timeRange),
        fetchRedisSystemInfo()
      ]);
      
      setRedisMemoryData(memoryData);
      setRedisClientsData(clientsData);
      setRedisOpsData(opsData);
      setRedisInfo(info);
      
      if (memoryData.length > 0) setCurrentUsage(memoryData[memoryData.length - 1].usage);
      if (clientsData.length > 0) setCurrentClients(clientsData[clientsData.length - 1].clients);
      if (opsData.length > 0) setCurrentOps(opsData[opsData.length - 1].ops);
    } catch (error) {
      console.error("Erro ao conectar com APIs de métricas", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMetrics();

    const interval = setInterval(() => {
      setRedisMemoryData(prev => {
        if (prev.length === 0 || loading) return prev;
        const lastPoint = prev[prev.length - 1];
        const newPoint = getLiveRedisMemoryUpdate(lastPoint.usage);
        setCurrentUsage(newPoint.usage);
        return [...prev.slice(1), newPoint];
      });

      setRedisClientsData(prev => {
        if (prev.length === 0 || loading) return prev;
        const lastPoint = prev[prev.length - 1];
        const newPoint = getLiveRedisClientsUpdate(lastPoint.clients);
        setCurrentClients(newPoint.clients);
        return [...prev.slice(1), newPoint];
      });

      setRedisOpsData(prev => {
        if (prev.length === 0 || loading) return prev;
        const lastPoint = prev[prev.length - 1];
        const newPoint = getLiveRedisOpsUpdate(lastPoint.ops);
        setCurrentOps(newPoint.ops);
        return [...prev.slice(1), newPoint];
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [timeRange]);

  // Computed filtered and sorted events
  const processedEvents = useMemo(() => {
    let result = [...events];
    if (eventTypeFilter !== 'ALL') {
      result = result.filter(e => {
        if (eventTypeFilter === 'SYNC') return e.type.includes('SYNC');
        if (eventTypeFilter === 'EXECUTION') return e.type.includes('EXECUTION') || e.type.includes('SENT');
        if (eventTypeFilter === 'SYSTEM') return e.type.includes('SCAN') || e.type.includes('FILE') || e.type.includes('APP');
        return true;
      });
    }
    if (eventSearch.trim()) {
      const s = eventSearch.toLowerCase();
      result = result.filter(e => 
        e.details.toLowerCase().includes(s) || 
        e.source.toLowerCase().includes(s) || 
        e.type.toLowerCase().includes(s)
      );
    }
    result.sort((a, b) => {
      const timeA = new Date(`1970/01/01 ${a.timestamp}`).getTime();
      const timeB = new Date(`1970/01/01 ${b.timestamp}`).getTime();
      return eventSortOrder === 'NEWEST' ? timeB - timeA : timeA - timeB;
    });
    return result;
  }, [events, eventTypeFilter, eventSearch, eventSortOrder]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn pb-10">
      {/* Coluna Principal */}
      <div className="lg:col-span-2 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard title="Memória Neural v15" value={learnedCount.toLocaleString()} icon="🧠" color="text-red-500" />
          <StatCard 
            title="Status Google Sheets" 
            value={isSheetsLoading ? "Sincronizando..." : "Conectado"} 
            icon="📊" 
            color={isSheetsLoading ? "text-slate-500" : "text-emerald-500"} 
            animateIcon={isSheetsLoading}
          />
          <StatCard title="Monitor macOS" value="100% Live" icon="🔴" color="text-red-600" animateIcon />
        </div>

        {/* Neural Integrity & Active Connections Panel */}
        <div className="glass-panel rounded-xl p-6 border border-white/5 bg-slate-900/40 relative overflow-hidden">
           <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
              <span className="text-8xl font-black">VY</span>
           </div>
           <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500 mb-6 flex items-center gap-2">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_#10b981]"></span>
              Integridade de Conexões Externas
           </h3>
           <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-black/40 rounded-xl border border-white/5 space-y-2">
                 <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Evolution API</div>
                 <div className="text-[10px] font-mono text-emerald-500 truncate">{evoConfig.baseUrl}</div>
                 <div className="text-[9px] font-black uppercase text-slate-400">Instância: <span className="text-white">{evoConfig.instance}</span></div>
              </div>
              <div className="p-4 bg-black/40 rounded-xl border border-white/5 space-y-2">
                 <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest">PostgreSQL Cluster</div>
                 <div className="text-[10px] font-mono text-blue-400">evolution-postgres</div>
                 <div className="text-[9px] font-black uppercase text-slate-400">Status: <span className="text-emerald-500">READY</span></div>
              </div>
              <div className="p-4 bg-black/40 rounded-xl border border-white/5 space-y-2">
                 <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Gemini Engine</div>
                 <div className="text-[10px] font-mono text-red-500">gemini-3-pro-preview</div>
                 <div className="text-[9px] font-black uppercase text-slate-400">Região: <span className="text-white">US-CENTRAL1</span></div>
              </div>
           </div>
        </div>

        {/* Business Assets: Enside Madeiras */}
        <div className="glass-panel rounded-xl p-6 border border-white/5 shadow-2xl relative overflow-hidden">
           <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
           <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-6 flex items-center justify-between">
              <span className="flex items-center gap-2">
                 <span className={`w-1.5 h-1.5 bg-emerald-500 rounded-full ${isSheetsLoading ? 'animate-ping' : 'animate-pulse'}`}></span>
                 ENSIDE MADEIRAS - Base Master Sheets
              </span>
              <span className={`text-[9px] font-mono ${isSheetsLoading ? 'text-slate-500' : 'text-emerald-500'} bg-emerald-500/10 px-2 py-0.5 rounded`}>
                {isSheetsLoading ? 'SYNCING...' : 'CONECTADO'}
              </span>
           </h3>
           <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <BusinessNode label="Transportadores" value={isSheetsLoading ? '...' : transportCount} icon="🚚" color="text-yellow-500" />
              <BusinessNode label="Clientes Base" value={isSheetsLoading ? '...' : clientCount} icon="👥" color="text-emerald-400" />
              <BusinessNode label="Fornecedores" value={isSheetsLoading ? '...' : supplierCount} icon="🏭" color="text-blue-400" />
              <BusinessNode label="Total Geral" value={isSheetsLoading ? '...' : totalContacts.toLocaleString()} icon="📊" color="text-amber-500" />
           </div>
        </div>

        {/* Painel de Gráficos de Infraestrutura */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           <ChartCard title="Redis Memory (MB)" color="bg-emerald-600">
              <div className="absolute top-4 right-4 flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                 <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                 <span className="text-[9px] font-mono font-black text-emerald-500 uppercase">{currentUsage.toFixed(1)} MB</span>
              </div>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={redisMemoryData} margin={{ top: 10, right: 0, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorEmerald" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff0a" vertical={false} />
                  <XAxis dataKey="time" stroke="#475569" fontSize={8} axisLine={false} tickLine={false} interval={4} />
                  <YAxis stroke="#475569" fontSize={8} axisLine={false} tickLine={false} domain={[0, 250]} />
                  <Tooltip content={<CustomTooltip unit="MB" />} />
                  <Area type="monotone" dataKey="usage" name="Uso de Memória" stroke="#10b981" fill="url(#colorEmerald)" strokeWidth={3} isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
           </ChartCard>

           <ChartCard title="Command Ops Statistics" color="bg-blue-600">
              <div className="absolute top-4 right-4 flex items-center gap-1 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                 <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></span>
                 <span className="text-[9px] font-mono font-black text-blue-500 uppercase">{currentOps} CMD/S</span>
              </div>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={redisOpsData} margin={{ top: 10, right: 0, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff0a" vertical={false} />
                  <XAxis dataKey="time" stroke="#475569" fontSize={8} axisLine={false} tickLine={false} interval={2} />
                  <YAxis stroke="#475569" fontSize={8} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip unit="Ops/s" />} />
                  <Line type="stepAfter" dataKey="ops" name="Comandos/s" stroke="#3b82f6" strokeWidth={2} dot={false} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
           </ChartCard>
        </div>

        {/* Monitor de Eventos */}
        <div className="glass-panel rounded-xl p-6 border border-white/5 shadow-2xl relative overflow-hidden h-[450px] flex flex-col">
           <div className="absolute top-0 left-0 w-1 h-full bg-red-600"></div>
           <div className="mb-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-red-600 rounded-full animate-ping"></span>
                    Monitor de Integração Sheets & Vy
                </h3>
                <div className="flex items-center gap-2">
                  <button onClick={() => setEventSortOrder(prev => prev === 'NEWEST' ? 'OLDEST' : 'NEWEST')} className="text-[9px] font-black uppercase bg-white/5 border border-white/10 px-2 py-1 rounded hover:bg-white/10 transition-colors">
                    {eventSortOrder === 'NEWEST' ? '↓ Recentes' : '↑ Antigos'}
                  </button>
                  <span className="text-[9px] font-mono text-slate-500">LIVE FEED</span>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <input type="text" placeholder="Filtrar eventos..." value={eventSearch} onChange={(e) => setEventSearch(e.target.value)} className="w-full bg-slate-900 border border-white/5 rounded-lg px-8 py-2 text-[10px] font-mono text-white focus:outline-none focus:border-red-500/50" />
                  <span className="absolute left-2.5 top-2.5 opacity-30 text-xs">🔍</span>
                </div>
                <div className="flex gap-1 bg-black/40 p-1 rounded-lg border border-white/5">
                  <FilterPill label="All" active={eventTypeFilter === 'ALL'} onClick={() => setEventTypeFilter('ALL')} />
                  <FilterPill label="Sync" active={eventTypeFilter === 'SYNC'} onClick={() => setEventTypeFilter('SYNC')} />
                  <FilterPill label="Vy" active={eventTypeFilter === 'EXECUTION'} onClick={() => setEventTypeFilter('EXECUTION')} />
                  <FilterPill label="Sys" active={eventTypeFilter === 'SYSTEM'} onClick={() => setEventTypeFilter('SYSTEM')} />
                </div>
              </div>
           </div>
           <div className="flex-1 overflow-y-auto space-y-2 pr-2 scrollbar-thin">
             {processedEvents.map(event => (
               <div key={event.id} className="bg-white/[0.03] border border-white/5 rounded-lg p-3 flex items-start gap-4 animate-slideInRight group hover:border-red-500/30 transition-all">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0 ${event.source === 'Google Sheets' ? 'bg-emerald-900/40 text-emerald-400' : 'bg-blue-900/40 text-blue-500'}`}>
                    {event.source === 'Google Sheets' ? 'SH' : 'VY'}
                  </div>
                  <div className="flex-1 min-w-0">
                     <div className="flex justify-between items-center mb-1">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-tighter truncate pr-2">{event.type} • {event.source}</span>
                        <span className="text-[9px] font-mono text-slate-600 shrink-0">{event.timestamp}</span>
                     </div>
                     <p className="text-[11px] text-slate-300 font-medium font-mono break-words">{event.details}</p>
                  </div>
               </div>
             ))}
           </div>
        </div>
      </div>

      {/* Barra Lateral Direita */}
      <div className="flex flex-col gap-6">
        <div className="glass-panel rounded-xl p-5 border border-white/5 bg-emerald-600/5">
           <h3 className="text-xs font-black uppercase tracking-widest text-emerald-500 mb-4 flex justify-between items-center">
             Sincronização Master
             <span className="text-[9px] bg-emerald-500/10 px-2 py-0.5 rounded text-emerald-400">{isSheetsLoading ? 'SYNCING' : 'ACTIVE'}</span>
           </h3>
           <div className="space-y-3">
              <div className="flex justify-between items-center text-[10px] font-mono">
                 <span className="text-slate-500">Planilha ID</span>
                 <span className="text-slate-300">...KyIE</span>
              </div>
              <div className="flex justify-between items-center text-[10px] font-mono">
                 <span className="text-slate-500">Último Sync</span>
                 <span className="text-emerald-500 font-black">{isSheetsLoading ? 'PROCESSANDO...' : 'AGORA'}</span>
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-4">
                 <div className={`bg-emerald-500 h-full ${isSheetsLoading ? 'animate-pulse w-1/2' : 'w-full'}`}></div>
              </div>
           </div>
        </div>

        <div className="glass-panel rounded-xl flex-1 flex flex-col min-h-[300px] border border-white/5 shadow-2xl">
          <div className="p-4 border-b border-white/5 flex items-center justify-between bg-slate-900/60">
            <h3 className="text-[10px] font-mono font-bold uppercase tracking-widest text-red-500 flex items-center gap-2">
              VY_COMMAND_EXECUTOR
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto p-4 font-mono text-[9px] leading-relaxed space-y-1 bg-black/40">
            {logs.map(log => (
              <div key={log.id} className="flex gap-2 animate-fadeIn py-0.5 border-b border-white/[0.02]">
                <span className={`font-bold ${log.level === 'success' ? 'text-green-500' : 'text-blue-400'}`}>
                  {log.module}:
                </span>
                <span className="text-slate-300 break-words">{log.message}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-panel rounded-xl p-5 border border-white/5 bg-slate-900/40">
           <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-4">Sistemas Mapeados</h3>
           <div className="space-y-2 max-h-[180px] overflow-y-auto pr-2 scrollbar-thin">
              {MAPPED_SYSTEMS.map(sys => (
                <div key={sys.name} className="p-3 bg-white/5 rounded-lg border border-white/5 flex items-center gap-3">
                   <div className="w-8 h-8 rounded bg-slate-800 flex items-center justify-center text-sm shadow-inner shrink-0">
                      {sys.icon || (sys.type === 'repo' ? '🐙' : sys.type === 'html' ? '🌐' : '📁')}
                   </div>
                   <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-0.5">
                         <span className="text-[10px] font-black text-slate-200 truncate pr-2 uppercase tracking-tighter">{sys.name}</span>
                         <span className="text-[7px] px-1 py-0.5 rounded bg-slate-700/50 text-slate-400 font-black uppercase shrink-0">{sys.type}</span>
                      </div>
                      <p className="text-[9px] font-mono text-slate-500 truncate">{sys.path}</p>
                   </div>
                </div>
              ))}
           </div>
        </div>
      </div>
    </div>
  );
};

const FilterPill: React.FC<{ label: string, active: boolean, onClick: () => void }> = ({ label, active, onClick }) => (
  <button onClick={onClick} className={`px-3 py-1 rounded text-[8px] font-black uppercase transition-all ${active ? 'bg-red-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>
    {label}
  </button>
);

const StatCard: React.FC<{ title: string, value: string | number, icon: string, color: string, animateIcon?: boolean }> = ({ title, value, icon, color, animateIcon }) => (
  <div className="glass-panel rounded-xl p-5 border border-white/5 shadow-lg group hover:border-red-500/30 transition-all cursor-default">
    <div className="flex justify-between items-start mb-4">
      <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">{title}</span>
      <span className={`text-xl group-hover:scale-125 transition-transform duration-500 ${animateIcon ? 'animate-pulse text-red-600' : ''}`}>{icon}</span>
    </div>
    <div className={`text-2xl font-black tracking-tighter ${color}`}>{value}</div>
  </div>
);

const ChartCard: React.FC<{ title: string, children: React.ReactNode, color: string }> = ({ title, children, color }) => (
  <div className="glass-panel rounded-xl p-5 border border-white/5 shadow-xl relative overflow-hidden h-60">
    <div className={`absolute top-0 left-0 w-1 h-full ${color}`}></div>
    <h3 className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-500 mb-4">{title}</h3>
    <div className="h-40">{children}</div>
  </div>
);

const BusinessNode: React.FC<{ label: string, value: string | number, icon: string, color: string }> = ({ label, value, icon, color }) => (
  <div className="bg-white/5 p-3 rounded-xl border border-white/5 flex flex-col items-center text-center group hover:border-emerald-500/30 transition-all">
    <span className="text-lg mb-1">{icon}</span>
    <span className={`text-[11px] font-black ${color} mb-0.5`}>{value}</span>
    <span className="text-[8px] font-black text-slate-500 uppercase tracking-tighter">{label}</span>
  </div>
);

export default Dashboard;
