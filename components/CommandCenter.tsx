
import React, { useState, useEffect } from 'react';
import { COMMANDS } from '../constants';
import { SystemStatus, CommandHistoryItem, SystemEvent } from '../types';
import { getEvolutionConfig, saveEvolutionConfig, fetchInstanceStatus } from '../services/evolutionService';
import { sendPush } from '../services/notificationService';

interface CommandCenterProps {
  setStatus: (status: SystemStatus) => void;
  addLog: (message: string, level: 'info' | 'warn' | 'error' | 'success', module?: string) => void;
  addEvent: (type: SystemEvent['type'], source: string, details: string) => void;
  refreshSheetsData: () => Promise<void>;
}

const CommandCenter: React.FC<CommandCenterProps> = ({ setStatus, addLog, addEvent, refreshSheetsData }) => {
  const [activeCommand, setActiveCommand] = useState<string | null>(null);
  const [history, setHistory] = useState<CommandHistoryItem[]>([]);
  const [showConfig, setShowConfig] = useState(false);
  const [isTestingConn, setIsTestingConn] = useState(false);
  const [connResult, setConnResult] = useState<{status: 'idle' | 'success' | 'error', msg: string}>({status: 'idle', msg: ''});
  
  // Evolution Config State
  const [evoConfig, setEvoConfig] = useState(getEvolutionConfig());

  useEffect(() => {
    const savedHistory = localStorage.getItem('enside_command_history');
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error("Failed to parse command history", e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('enside_command_history', JSON.stringify(history));
  }, [history]);

  const handleSaveConfig = () => {
    saveEvolutionConfig(evoConfig);
    addLog("Configurações Evolution API salvas localmente.", "success", "SYSTEM");
    setShowConfig(false);
    testConnection(); // Testa logo após salvar
  };

  const testConnection = async () => {
    setIsTestingConn(true);
    setConnResult({status: 'idle', msg: 'Pingando gateway...'});
    try {
      const data = await fetchInstanceStatus(evoConfig.instance);
      if (data.status === 'open') {
        setConnResult({status: 'success', msg: `ONLINE: Instância ${data.instance} ativa.`});
        addLog(`Conexão Evolution OK: ${data.number}`, "success", "EVOLUTION");
      } else {
        setConnResult({status: 'error', msg: `OFFLINE: Verifique o QR Code na instância ${data.instance}.`});
        addLog(`Aviso: Instância ${data.instance} desconectada.`, "warn", "EVOLUTION");
      }
    } catch (e) {
      setConnResult({status: 'error', msg: 'ERRO: Gateway Evolution inacessível via Proxy.'});
      addLog("Erro crítico ao testar conexão Evolution API.", "error", "SYSTEM");
    } finally {
      setIsTestingConn(false);
    }
  };

  const addToHistory = (cmdId: string, label: string, status: CommandHistoryItem['status']) => {
    const newItem: CommandHistoryItem = {
      id: Math.random().toString(36).substr(2, 9),
      commandId: cmdId,
      label,
      timestamp: new Date().toLocaleString(),
      status
    };
    setHistory(prev => [newItem, ...prev].slice(0, 50));
  };

  const testNotification = () => {
    sendPush("🧠 TESTE NEURAL", {
      body: "Sistema de notificações push operando em nível crítico. Master Evolution v15.0 pronto.",
      priority: 'high',
      tag: 'test-notif'
    });
    addLog("Comando de teste de notificação disparado.", "info", "SYSTEM");
  };

  const executeCommand = async (cmdId: string, label: string) => {
    if (activeCommand) return;

    setActiveCommand(cmdId);
    addToHistory(cmdId, label, 'STARTED');
    
    if (cmdId.includes('search') || cmdId.includes('scan') || cmdId === 'sync_full') setStatus(SystemStatus.SCANNING);
    else if (cmdId.includes('sync')) setStatus(SystemStatus.LEARNING);
    else if (cmdId.includes('monitor')) setStatus(SystemStatus.MONITORING);
    else setStatus(SystemStatus.EXECUTING);

    addLog(`Iniciando Módulo: ${label}`, 'info', 'SYSTEM');

    try {
      if (cmdId === 'sync_sheets') {
        await refreshSheetsData();
        addLog(`Módulo '${label}' concluído com sucesso via GVIZ.`, 'success', 'SHEETS');
        addEvent('SYNC_EVENT', 'Command Center', 'Sincronização de planilhas executada manualmente.');
      } 
      else if (cmdId === 'sync_evolution') {
        addLog("Conectando à Evolution API...", "info", "EVOLUTION");
        const status = await fetchInstanceStatus();
        if (status.status === 'open') {
          addLog(`Instância [${status.instance}] está ONLINE. Número: ${status.number}`, "success", "EVOLUTION");
          await new Promise(r => setTimeout(r, 1000));
          addLog("Sincronizando metadados de chats e mensagens...", "info", "EVOLUTION");
          addEvent('SYNC_EVOLUTION', 'Evolution API', `Instância ${status.instance} sincronizada.`);
        } else {
          addLog(`Instância [${status.instance}] DESCONECTADA. Verifique o QR Code.`, "error", "EVOLUTION");
        }
      }
      else if (cmdId === 'sync_full') {
        addLog("Iniciando Sincronização Global...", "info", "BRAIN_SYNC");
        await new Promise(r => setTimeout(r, 1000));
        addLog("Indexando Memória Neural...", "info", "KNOWLEDGE");
        await refreshSheetsData();
        addLog("Persistindo Snapshot Unificado...", "success", "REDIS");
        addEvent('SYNC_EVENT', 'Master Sync', 'Estado global sincronizado.');
      } else {
        await new Promise(r => setTimeout(r, 1500));
        addLog(`Módulo '${label}' concluído.`, 'success', 'SYSTEM');
        addEvent('SYSTEM_SCAN', 'Central Vy', `Módulo ${label} executado.`);
      }

      addToHistory(cmdId, label, 'COMPLETED');
    } catch (err) {
      addLog(`Falha na execução do módulo '${label}'.`, 'error', 'CORE');
      addToHistory(cmdId, label, 'FAILED');
    } finally {
      setStatus(SystemStatus.MONITORING);
      setActiveCommand(null);
    }
  };

  const categories = ['integration', 'sync', 'business', 'monitor', 'organize', 'system'];

  return (
    <div className="max-w-6xl mx-auto space-y-12 animate-fadeIn pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-4xl font-bold tracking-tighter flex items-center gap-4">
             <span className="text-red-500">⚡</span> Central Master Evolution
          </h2>
          <p className="text-slate-400 mt-2 text-sm max-w-xl">Controle v15.0: Integração de Sistemas, Sincronização Enside e Agente Vy.</p>
        </div>
        <div className="flex gap-3">
           <button 
            onClick={testNotification}
            className="px-6 py-3 bg-blue-600/20 text-blue-400 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600/30 transition-all border border-blue-500/30"
           >
            🔔 Testar Notificação
           </button>
           <button 
            onClick={() => setShowConfig(!showConfig)}
            className="px-6 py-3 bg-slate-800 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-700 transition-all border border-white/10"
           >
            ⚙️ Config Evolution
           </button>
           <button 
            onClick={() => executeCommand('sync_full', 'Sincronização Global')}
            className="px-6 py-3 bg-red-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-red-600/20 hover:scale-105 transition-all border border-white/10"
           >
            🚀 Sync Global
           </button>
        </div>
      </div>

      {showConfig && (
        <div className="glass-panel rounded-3xl p-8 border border-emerald-500/30 animate-slideInDown">
           <div className="flex justify-between items-center mb-6">
              <h3 className="text-emerald-500 font-black text-xs uppercase tracking-widest">Configuração Evolution API</h3>
              <div className="flex items-center gap-3">
                 <div className={`text-[10px] font-black uppercase px-3 py-1 rounded-full border ${
                    connResult.status === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500' :
                    connResult.status === 'error' ? 'bg-red-500/10 border-red-500/30 text-red-500' :
                    'bg-slate-500/10 border-slate-500/30 text-slate-500'
                 }`}>
                    {connResult.msg}
                 </div>
                 <button 
                  onClick={testConnection} 
                  disabled={isTestingConn}
                  className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-[9px] font-black uppercase rounded-lg border border-white/10 transition-all"
                 >
                   {isTestingConn ? 'TESTANDO...' : 'TESTAR AGORA'}
                 </button>
              </div>
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                 <label className="text-[10px] font-bold text-slate-500 uppercase">Base URL (Gateway)</label>
                 <input 
                  type="text" 
                  value={evoConfig.baseUrl} 
                  onChange={e => setEvoConfig({...evoConfig, baseUrl: e.target.value})}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                  placeholder="https://..."
                 />
              </div>
              <div className="space-y-2">
                 <label className="text-[10px] font-bold text-slate-500 uppercase">Instância Master</label>
                 <input 
                  type="text" 
                  value={evoConfig.instance} 
                  onChange={e => setEvoConfig({...evoConfig, instance: e.target.value})}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                  placeholder="ex: enside"
                 />
              </div>
              <div className="space-y-2">
                 <label className="text-[10px] font-bold text-slate-500 uppercase">Global API Key</label>
                 <input 
                  type="password" 
                  value={evoConfig.token} 
                  onChange={e => setEvoConfig({...evoConfig, token: e.target.value})}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                  placeholder="Sua chave secreta..."
                 />
              </div>
           </div>
           <div className="mt-6 flex justify-end gap-3 pt-6 border-t border-white/5">
              <button onClick={() => setShowConfig(false)} className="text-[10px] font-black uppercase text-slate-500 px-4">Cancelar</button>
              <button onClick={handleSaveConfig} className="bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-3 rounded-xl text-[10px] font-black uppercase shadow-lg shadow-emerald-600/20 transition-all">Salvar Configurações</button>
           </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-12">
        <div className="xl:col-span-3 space-y-12">
          {categories.map(cat => (
            <div key={cat} className="space-y-6">
              <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.3em] border-l-2 border-red-500 pl-4">{cat.toUpperCase()} MODULES</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {COMMANDS.filter(c => c.category === cat).map(cmd => (
                  <div 
                    key={cmd.id} 
                    className={`glass-panel rounded-2xl p-6 border border-white/5 group transition-all duration-300 relative overflow-hidden flex flex-col ${activeCommand === cmd.id ? 'ring-2 ring-red-500 scale-[1.02]' : 'hover:border-red-500/30'}`}
                  >
                    <div className="flex justify-between items-start mb-6">
                      <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                        {cmd.icon}
                      </div>
                    </div>
                    <h3 className="text-lg font-bold mb-2 group-hover:text-red-500 transition-colors tracking-tight">{cmd.label}</h3>
                    
                    {/* Tooltip Wrapper */}
                    <div className="relative group/desc flex-grow">
                      <p 
                        title={cmd.description}
                        className="text-xs text-slate-500 mb-8 leading-relaxed line-clamp-2 cursor-help group-hover/desc:text-slate-300 transition-colors"
                      >
                        {cmd.description}
                      </p>
                      {/* Styled Custom Tooltip Overlay */}
                      <div className="absolute bottom-full mb-3 left-0 w-full p-4 bg-slate-900/95 backdrop-blur-md border border-red-500/30 rounded-xl text-[11px] text-slate-200 opacity-0 group-hover/desc:opacity-100 pointer-events-none transition-all duration-300 z-50 shadow-[0_10px_30px_rgba(0,0,0,0.5)] translate-y-2 group-hover/desc:translate-y-0">
                        <div className="text-[8px] font-black text-red-500 uppercase tracking-widest mb-2 border-b border-white/5 pb-1 flex items-center gap-2">
                           <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                           Módulo Info
                        </div>
                        {cmd.description}
                        <div className="absolute top-full left-6 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[8px] border-t-slate-900/95"></div>
                      </div>
                    </div>

                    <button 
                      onClick={() => executeCommand(cmd.id, cmd.label)}
                      disabled={activeCommand !== null}
                      className={`w-full py-4 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] transition-all ${
                        activeCommand === cmd.id ? 'bg-red-600 text-white animate-pulse' : 'bg-white/5 hover:bg-red-600 hover:text-white border border-white/10'
                      }`}
                    >
                      {activeCommand === cmd.id ? 'EXECUTANDO...' : 'EXECUTAR'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="xl:col-span-1 space-y-6">
           <div className="glass-panel rounded-3xl p-6 border border-white/5 h-[600px] flex flex-col sticky top-6">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-6">Audit History</h3>
              <div className="flex-1 overflow-y-auto space-y-4 pr-2 scrollbar-thin">
                {history.map((item) => (
                  <div key={item.id} className="bg-white/5 border border-white/5 rounded-xl p-4 text-[10px]">
                    <div className="flex justify-between items-start mb-2">
                      <span className={`font-black uppercase px-2 py-0.5 rounded ${item.status === 'COMPLETED' ? 'text-emerald-500 bg-emerald-500/10' : 'text-blue-500 bg-blue-500/10'}`}>
                        {item.status}
                      </span>
                      <span className="text-slate-600">{item.timestamp.split(', ')[1]}</span>
                    </div>
                    <div className="font-bold text-slate-300 uppercase truncate">{item.label}</div>
                  </div>
                ))}
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default CommandCenter;
