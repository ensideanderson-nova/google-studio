
import React, { useState, useEffect, useCallback } from 'react';
import { HashRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import ChatInterface from './components/ChatInterface';
import KnowledgeBase from './components/KnowledgeBase';
import CommandCenter from './components/CommandCenter';
import SheetsExplorer from './components/SheetsExplorer';
import TransmissionManager from './components/TransmissionManager';
import { SystemStatus, SystemLog, SystemEvent, SheetContact } from './types';
import { fetchMasterContacts } from './services/sheetsService';
import { SHEET_TABS } from './constants';
import * as NotificationService from './services/notificationService';
import { fetchInstanceStatus } from './services/evolutionService';

const App: React.FC = () => {
  const [status, setStatus] = useState<SystemStatus>(SystemStatus.IDLE);
  const [learnedCount, setLearnedCount] = useState(37232);
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [events, setEvents] = useState<SystemEvent[]>([]);
  const [isFabOpen, setIsFabOpen] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(
    NotificationService.getNotificationPermission()
  );
  
  // Global Sheets State
  const [contacts, setContacts] = useState<SheetContact[]>([]);
  const [isSheetsLoading, setIsSheetsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(SHEET_TABS[0]);

  const handleRequestPermission = async () => {
    const permission = await NotificationService.requestNotificationPermission();
    setNotificationPermission(permission);
    if (permission === 'granted') {
      NotificationService.sendPush("ESPECIALISTA-IA v15.0", {
        body: "Alertas críticos e push habilitados com sucesso."
      });
    }
  };

  const addLog = useCallback((message: string, level: SystemLog['level'] = 'info', module: string = 'CORE') => {
    const newLog: SystemLog = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toLocaleTimeString(),
      level,
      message,
      module
    };
    setLogs(prev => [newLog, ...prev].slice(0, 100));

    // Notificação automática para erros críticos
    if (level === 'error') {
      NotificationService.notifyCriticalError(module, message);
    }
    
    // Notificação para conclusões de módulos importantes
    if (level === 'success' && (module === 'BROADCAST' || module === 'SHEETS' || module === 'SYSTEM')) {
      NotificationService.notifyTaskCompleted(module, message);
    }
  }, []);

  const addEvent = useCallback((type: SystemEvent['type'], source: string, details: string) => {
    const newEvent: SystemEvent = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toLocaleTimeString(),
      type,
      source,
      details
    };
    setEvents(prev => [newEvent, ...prev].slice(0, 50));
    setLearnedCount(prev => prev + 1);

    // Alertas de segurança ou falhas de sincronização detectados via eventos
    if (type === 'SYNC_EVENT' && details.toLowerCase().includes('falha')) {
      NotificationService.notifyCriticalError('SINCRONIZAÇÃO', `${source}: ${details}`);
    }
    if (type === 'SYSTEM_SCAN' && (details.toLowerCase().includes('anomalia') || details.toLowerCase().includes('erro'))) {
      NotificationService.notifyCriticalError('SEGURANÇA', details);
    }
  }, []);

  const refreshSheetsData = async (tab = activeTab) => {
    setIsSheetsLoading(true);
    setActiveTab(tab);
    try {
      addLog(`IA Sincronizando aba [${tab.label}]...`, "info", "BRAIN");
      const data = await fetchMasterContacts(tab.gid);
      setContacts(data);
      addLog(`Contexto '${tab.label}' carregado: ${data.length} registros.`, "success", "SHEETS");
      addEvent('SYNC_EVENT', 'Google Sheets', `Neural Sync concluído na aba ${tab.label}.`);
    } catch (error) {
      addLog(`Falha no mapeamento da aba ${tab.label}.`, "error", "SHEETS");
      setContacts([
        { nome: 'Erro de Sincronização', categoria: 'CLIENTE', cidade: 'Sistema', whatsapp: 'S/N', status: 'Offline' }
      ]);
      addEvent('SYNC_EVENT', 'Google Sheets', `Falha crítica ao acessar GID ${tab.gid}`);
    } finally {
      setIsSheetsLoading(false);
    }
  };

  useEffect(() => {
    const bootSequence = [
      { msg: "🔄 INICIANDO INTEGRADOR DE SISTEMAS v2.0...", level: 'info', module: 'BOOT' },
      { msg: "🤖 Agente Unificado v15.0 ONLINE.", level: 'info', module: 'CORE' },
      { msg: "⚡ Sincronizando Contexto Master...", level: 'success', module: 'INTEGRATION' }
    ];

    bootSequence.forEach((item, index) => {
      setTimeout(() => {
        addLog(item.msg, item.level as any, item.module);
        if (index === bootSequence.length - 1) {
          setStatus(SystemStatus.MONITORING);
          refreshSheetsData();
        }
      }, index * 200);
    });

    // Monitor de Saúde Crítico em Background
    const healthCheck = setInterval(async () => {
      try {
        const { status, instance } = await fetchInstanceStatus();
        if (status !== 'open') {
          addLog(`ALERTA: Instância WhatsApp [${instance}] desconectada!`, 'error', 'EVOLUTION');
          addEvent('SYNC_EVENT', 'Evolution Monitor', `Instância ${instance} entrou em estado ${status.toUpperCase()}`);
        }
      } catch (e) {
        addLog("Gateway Evolution API inacessível via Proxy Vercel", 'error', 'SYSTEM');
      }
    }, 120000); // Verifica a cada 2 minutos

    // Monitor de Atividade Simulada
    const monitorInterval = setInterval(() => {
      if (Math.random() > 0.95) {
        const types: SystemEvent['type'][] = ['FILE_MODIFIED', 'APP_ACTIVE', 'VY_EXECUTION', 'SYSTEM_SCAN'];
        const t = types[Math.floor(Math.random() * types.length)];
        addEvent(t, 'Monitor Live', 'Atividade de background detectada.');
      }
    }, 15000);

    return () => {
      clearInterval(healthCheck);
      clearInterval(monitorInterval);
    };
  }, [addLog, addEvent]);

  return (
    <HashRouter>
      <div className="flex h-screen overflow-hidden">
        {/* Sidebar */}
        <nav className="w-20 md:w-64 bg-slate-950 border-r border-white/10 flex flex-col transition-all duration-300">
          <div className="p-4 flex items-center gap-3 border-b border-white/10">
            <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center text-2xl shadow-lg glow-red animate-pulse">
              🤖
            </div>
            <div className="hidden md:block">
              <h1 className="text-sm font-bold tracking-tighter">ESPECIALISTA-IA</h1>
              <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Master Evolution v15.0</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto py-4">
            <NavItem to="/" icon="📊" label="Dashboard" />
            <NavItem to="/sheets" icon="🗂️" label="Sheets Explorer" />
            <NavItem to="/broadcast" icon="📱" label="Transmissão WA" />
            <NavItem to="/chat" icon="💬" label="Chat IA (Vy)" />
            <NavItem to="/commands" icon="⚡" label="Central Vy" />
            <NavItem to="/knowledge" icon="📚" label="Memória Neural" />
          </div>

          <div className="p-4 border-t border-white/10 hidden md:block">
            <div className="bg-slate-900/50 rounded-lg p-3 border border-white/5">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-tighter">Cérebro Ativo</span>
                <span className="text-xs font-mono text-red-400">{learnedCount.toLocaleString()}</span>
              </div>
              <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                <div className="bg-red-500 h-full animate-pulse" style={{ width: '97%' }}></div>
              </div>
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <main className="flex-1 flex flex-col relative overflow-hidden bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black">
          <header className="h-16 flex items-center justify-between px-6 border-b border-white/5 glass-panel z-10">
            <div className="flex items-center gap-4">
               <div className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${status === SystemStatus.MONITORING ? 'bg-red-600 animate-pulse' : 'bg-green-500'}`}></div>
                  <span className="text-xs font-mono uppercase tracking-widest text-slate-400 font-bold">{status}</span>
               </div>
               <div className="h-4 w-px bg-white/10"></div>
               <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">
                  Contexto: {activeTab.label}
               </span>
            </div>
            <div className="flex items-center gap-6">
              {/* Notification Permission UI Control */}
              <button 
                onClick={handleRequestPermission}
                title={
                  notificationPermission === 'granted' ? 'Notificações Ativas' : 
                  notificationPermission === 'denied' ? 'Bloqueado pelo Navegador' : 'Habilitar Notificações'
                }
                className={`p-2 rounded-lg border transition-all flex items-center gap-2 group ${
                  notificationPermission === 'granted' 
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500' 
                  : notificationPermission === 'denied'
                  ? 'bg-red-500/10 border-red-500/30 text-red-500'
                  : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                }`}
              >
                <span className="text-xs">
                  {notificationPermission === 'granted' ? '🔔' : '🔕'}
                </span>
                <span className="text-[9px] font-black uppercase tracking-widest hidden sm:inline">
                  {notificationPermission === 'granted' ? 'Push Ativo' : 
                   notificationPermission === 'denied' ? 'Bloqueado' : 'Ligar Push'}
                </span>
              </button>
              
              <div className="h-4 w-px bg-white/10"></div>
              
              <div className="flex items-center gap-6 text-[10px] font-mono">
                <span className="flex items-center gap-2 text-slate-400">NEGÓCIO <span className="text-emerald-400 font-bold uppercase">ENSIDE</span></span>
                <span className="flex items-center gap-2 text-slate-400 text-xs">🤖 <span className="text-white">v15.0</span></span>
              </div>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto p-6 scroll-smooth">
            <Routes>
              <Route path="/" element={<Dashboard learnedCount={learnedCount} logs={logs} events={events} contacts={contacts} isSheetsLoading={isSheetsLoading} />} />
              <Route path="/sheets" element={<SheetsExplorer contacts={contacts} loading={isSheetsLoading} refreshData={refreshSheetsData} activeTab={activeTab} />} />
              <Route path="/broadcast" element={<TransmissionManager contacts={contacts} addLog={addLog} addEvent={addEvent} />} />
              <Route path="/chat" element={<ChatInterface addLog={addLog} contacts={contacts} events={events} activeTabLabel={activeTab.label} />} />
              <Route path="/knowledge" element={<KnowledgeBase />} />
              <Route path="/commands" element={<CommandCenter setStatus={setStatus} addLog={addLog} addEvent={addEvent} refreshSheetsData={() => refreshSheetsData()} />} />
            </Routes>
          </div>

          {/* FAB Master Unificado */}
          <div className="fixed bottom-6 right-6 z-50">
            <button 
              onClick={() => setIsFabOpen(!isFabOpen)}
              className="w-14 h-14 bg-red-600 rounded-full flex items-center justify-center text-3xl shadow-[0_0_20px_rgba(239,68,68,0.5)] hover:scale-110 active:scale-95 transition-all glow-red group"
            >
              <span>🤖</span>
            </button>
            {isFabOpen && (
              <div className="absolute bottom-16 right-0 w-64 glass-panel rounded-2xl border border-red-500/30 p-5 shadow-2xl animate-fadeIn">
                <div className="text-[10px] font-black text-red-400 uppercase mb-4 border-b border-white/5 pb-2">STATUS UNIFICADO</div>
                <div className="space-y-3">
                  <QuickStat label="Contexto IA" value={activeTab.label} color="text-emerald-400" />
                  <QuickStat label="Registros" value={contacts.length.toString()} />
                  <Link to="/sheets" onClick={() => setIsFabOpen(false)} className="block w-full text-center py-2 bg-emerald-600/20 text-emerald-400 rounded-lg text-[9px] font-black uppercase mt-2">Explorar Planilha</Link>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </HashRouter>
  );
};

const NavItem: React.FC<{ to: string, icon: string, label: string }> = ({ to, icon, label }) => {
  const location = useLocation();
  const isActive = location.pathname === to;
  return (
    <Link to={to} className={`flex items-center gap-4 px-6 py-4 transition-all hover:bg-white/5 group ${isActive ? 'border-r-4 border-red-500 bg-red-500/10' : ''}`}>
      <span className={`text-xl ${isActive ? 'grayscale-0' : 'grayscale opacity-60'}`}>{icon}</span>
      <span className={`hidden md:block text-xs font-bold uppercase tracking-widest ${isActive ? 'text-white' : 'text-slate-500'}`}>{label}</span>
    </Link>
  );
};

const QuickStat: React.FC<{ label: string, value: string, color?: string }> = ({ label, value, color = 'text-white' }) => (
  <div className="flex justify-between items-center text-[10px] font-mono">
    <span className="text-slate-500 uppercase font-bold">{label}</span>
    <span className={`font-black ${color}`}>{value}</span>
  </div>
);

export default App;
