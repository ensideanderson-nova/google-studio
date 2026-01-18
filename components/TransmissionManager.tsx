import React, { useState, useEffect } from 'react';
import { SheetContact, EvolutionInstance, TransmissionList, MessageTemplate } from '../types';
import { fetchInstanceStatus, sendWhatsAppMessage, fetchEvolutionContacts, fetchAllInstances, getEvolutionConfig, saveEvolutionConfig } from '../services/evolutionService';

interface TransmissionManagerProps {
  contacts: SheetContact[];
  addLog: (msg: string, level: any, module: string) => void;
  addEvent: (type: any, source: string, details: string) => void;
}

const DEFAULT_TEMPLATES: MessageTemplate[] = [
  { id: '1', title: '👋 Saudação Inicial', content: 'Olá [NOME], aqui é o Anderson da Enside Madeiras. Como estão os negócios hoje, [DATA]?' },
  { id: '2', title: '🪵 Oferta Mourão', content: 'Boa tarde [NOME]! Temos um lote especial de mourão 2.20m disponível hoje [DATA]. Gostaria de uma cotação?' },
  { id: '3', title: '🚚 Status Logística', content: 'Prezado [NOME], verificando disponibilidade de frete para a carga de hoje. Consegue carregar ainda em [DATA]?' }
];

/**
 * Normaliza e valida o número de WhatsApp
 * Remove caracteres não numéricos e garante o DDI 55 se ausente (para números brasileiros)
 */
const formatWhatsAppNumber = (number: string): string => {
  if (!number) return 'S/N';
  const clean = number.replace(/\D/g, '');
  if (clean.length < 8) return 'S/N';
  
  // Se não tem DDI 55 e parece ser um número BR (8 a 11 dígitos)
  if (!clean.startsWith('55') && (clean.length >= 8 && clean.length <= 11)) {
    return `55${clean}`;
  }
  
  return clean;
};

const TransmissionManager: React.FC<TransmissionManagerProps> = ({ contacts: initialContacts, addLog, addEvent }) => {
  const [instance, setInstance] = useState<EvolutionInstance | null>(null);
  const [availableInstances, setAvailableInstances] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [broadcastMsg, setBroadcastMsg] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('FORNECEDOR');
  const [activeListId, setActiveListId] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [progress, setProgress] = useState(0);
  const [savedLists, setSavedLists] = useState<TransmissionList[]>([]);
  const [listName, setListName] = useState('');
  const [localContacts, setLocalContacts] = useState<SheetContact[]>([]);

  // Templates State
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [templateTitle, setTemplateTitle] = useState('');
  const [showTemplateEditor, setShowTemplateEditor] = useState(false);

  useEffect(() => {
    // Ao receber novos contatos, garante que todos os números estejam normalizados
    const cleaned = initialContacts.map(c => ({
      ...c,
      whatsapp: formatWhatsAppNumber(c.whatsapp)
    }));
    setLocalContacts(cleaned);
    
    initializeEvolution();
    loadSavedLists();
    loadTemplates();

    // Check for staged messages from Chat
    const staged = localStorage.getItem('enside_staged_broadcast_msg');
    if (staged) {
      setBroadcastMsg(staged);
      localStorage.removeItem('enside_staged_broadcast_msg');
      addLog("Mensagem neural carregada para transmissão.", "success", "BROADCAST");
    }
  }, [initialContacts]);

  const loadSavedLists = () => {
    const saved = localStorage.getItem('enside_broadcast_lists');
    if (saved) {
      try {
        setSavedLists(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load saved lists", e);
        setSavedLists([]);
      }
    }
  };

  const loadTemplates = () => {
    const saved = localStorage.getItem('enside_message_templates');
    if (saved) {
      try {
        setTemplates(JSON.parse(saved));
      } catch (e) {
        setTemplates(DEFAULT_TEMPLATES);
      }
    } else {
      setTemplates(DEFAULT_TEMPLATES);
    }
  };

  const saveTemplatesToStorage = (updated: MessageTemplate[]) => {
    setTemplates(updated);
    localStorage.setItem('enside_message_templates', JSON.stringify(updated));
  };

  const addTemplate = () => {
    if (!templateTitle.trim() || !broadcastMsg.trim()) return alert("Título e conteúdo são necessários!");
    const newTemplate: MessageTemplate = {
      id: Date.now().toString(),
      title: templateTitle,
      content: broadcastMsg
    };
    const updated = [newTemplate, ...templates];
    saveTemplatesToStorage(updated);
    setTemplateTitle('');
    setShowTemplateEditor(false);
    addLog(`Template '${templateTitle}' persistido com sucesso.`, "success", "BROADCAST");
  };

  const deleteTemplate = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm("Remover este template permanentemente?")) {
      const updated = templates.filter(t => t.id !== id);
      saveTemplatesToStorage(updated);
    }
  };

  const initializeEvolution = async () => {
    setLoading(true);
    try {
      // 1. Fetch available instances
      const list = await fetchAllInstances();
      setAvailableInstances(list);

      // 2. Check status of current selected instance
      const config = getEvolutionConfig();
      const data = await fetchInstanceStatus(config.instance);
      setInstance({
        name: data.instance,
        status: data.status as any,
        number: data.number,
        apiKey: 'CONFIGURADA'
      });
      
      if (data.status === 'open') {
        addLog(`Evolution API: Instância [${data.instance}] ONLINE`, "success", "WHATSAPP");
      } else {
        addLog(`Evolution API: Instância [${data.instance}] OFFLINE ou não encontrada`, "warn", "WHATSAPP");
      }
    } catch (e) {
      addLog("Erro ao inicializar conexão com Evolution API", "error", "WHATSAPP");
    } finally {
      setLoading(false);
    }
  };

  const handleInstanceChange = async (instanceName: string) => {
    setLoading(true);
    addLog(`Alternando para instância: ${instanceName}...`, "info", "EVOLUTION");
    try {
      const config = getEvolutionConfig();
      const updatedConfig = { ...config, instance: instanceName };
      saveEvolutionConfig(updatedConfig);
      
      const data = await fetchInstanceStatus(instanceName);
      setInstance({
        name: data.instance,
        status: data.status as any,
        number: data.number,
        apiKey: 'CONFIGURADA'
      });
      
      if (data.status === 'open') {
        addLog(`Instância [${instanceName}] conectada com sucesso.`, "success", "WHATSAPP");
      } else {
        addLog(`Instância [${instanceName}] está desconectada.`, "warn", "WHATSAPP");
      }
    } catch (err) {
      addLog(`Erro ao alternar instância para ${instanceName}.`, "error", "WHATSAPP");
    } finally {
      setLoading(false);
    }
  };

  const syncEvolutionChats = async () => {
    if (instance?.status !== 'open') return alert("Instância desconectada!");
    setIsSyncing(true);
    addLog(`Iniciando varredura neural de chats ativos na instância ${instance.name}...`, "info", "EVOLUTION");
    
    try {
      const evoChats = await fetchEvolutionContacts(instance.name);
      const newContacts: SheetContact[] = evoChats.map((chat: any) => {
        const nome = chat.name || chat.pushName || "Contato WhatsApp";
        const id = chat.id || chat.remoteJid || '';
        const rawWhatsapp = id.split('@')[0];
        const whatsapp = formatWhatsAppNumber(rawWhatsapp);
        
        let categoria: any = 'CLIENTE';
        const nLower = nome.toLowerCase();
        if (nLower.includes('serraria') || nLower.includes('madeira') || nLower.includes('forn')) categoria = 'FORNECEDOR';
        else if (nLower.includes('frete') || nLower.includes('truck') || nLower.includes('trans')) categoria = 'TRANSPORTADOR';

        return {
          nome,
          categoria,
          cidade: "WhatsApp",
          whatsapp,
          status: "Live Sync"
        };
      });

      const existingNumbers = new Set(localContacts.map(c => c.whatsapp));
      const uniqueNew = newContacts.filter(c => c.whatsapp !== 'S/N' && !existingNumbers.has(c.whatsapp));
      
      setLocalContacts([...localContacts, ...uniqueNew]);
      addLog(`${uniqueNew.length} novos contatos sincronizados do WhatsApp.`, "success", "EVOLUTION");
      addEvent('SYNC_EVOLUTION', 'Evolution API', `Varredura completa na instância ${instance.name}: ${evoChats.length} chats lidos.`);
    } catch (err) {
      addLog("Erro na sincronização de chats.", "error", "EVOLUTION");
    } finally {
      setIsSyncing(false);
    }
  };

  const filteredContacts = activeListId 
    ? localContacts.filter(c => {
        const list = savedLists.find(l => l.id === activeListId);
        return list?.contacts.includes(c.whatsapp);
      })
    : localContacts.filter(c => 
        c.categoria === selectedCategory && 
        c.whatsapp !== 'S/N' && 
        c.whatsapp.length >= 10 // Pelo menos DDI + DDD + Numero
      );

  const saveCurrentList = () => {
    if (!listName) return alert("Dê um nome para a lista!");
    const newList: TransmissionList = {
      id: Date.now().toString(),
      name: listName,
      category: selectedCategory,
      contacts: filteredContacts.map(c => c.whatsapp)
    };
    const updated = [...savedLists, newList];
    setSavedLists(updated);
    localStorage.setItem('enside_broadcast_lists', JSON.stringify(updated));
    setListName('');
    addLog(`Lista '${listName}' salva com ${newList.contacts.length} contatos.`, "success", "BROADCAST");
  };

  const deleteList = (id: string) => {
    if (window.confirm("Remover esta lista permanentemente?")) {
      const updated = savedLists.filter(l => l.id !== id);
      setSavedLists(updated);
      localStorage.setItem('enside_broadcast_lists', JSON.stringify(updated));
      if (activeListId === id) setActiveListId(null);
      addLog("Lista removida da memória local.", "info", "BROADCAST");
    }
  };

  const handleStartBroadcast = async () => {
    if (!broadcastMsg.trim()) return alert("Digite uma mensagem!");
    if (filteredContacts.length === 0) return alert("Nenhum contato válido para envio.");
    if (instance?.status !== 'open') return alert("Instância WhatsApp desconectada!");

    const sourceLabel = activeListId ? `Lista: ${savedLists.find(l => l.id === activeListId)?.name}` : `Categoria: ${selectedCategory}`;
    const confirm = window.confirm(`Iniciar transmissão para ${filteredContacts.length} contatos? (${sourceLabel}) usando instância ${instance.name}`);
    if (!confirm) return;

    setIsSending(true);
    setProgress(0);
    addLog(`Iniciando Fila de Disparo Master (Instância: ${instance.name}) via ${sourceLabel}...`, "info", "BROADCAST");

    const todayStr = new Date().toLocaleDateString('pt-BR');
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < filteredContacts.length; i++) {
      const contact = filteredContacts[i];
      try {
        let personalMsg = broadcastMsg.replace(/\[NOME\]/gi, contact.nome.split(' ')[0]);
        personalMsg = personalMsg.replace(/\[DATA\]/gi, todayStr);
        
        await sendWhatsAppMessage(contact.whatsapp, personalMsg, instance.name);
        addEvent('WHATSAPP_SENT', 'Evolution API', `Enviado [${instance.name}]: ${contact.nome} (${contact.whatsapp})`);
        
        successCount++;
        const p = Math.round(((i + 1) / filteredContacts.length) * 100);
        setProgress(p);

        if (i < filteredContacts.length - 1) {
          const delay = Math.floor(Math.random() * 8000) + 12000; 
          await new Promise(r => setTimeout(r, delay));
        }
      } catch (err) {
        errorCount++;
        addLog(`Erro ao enviar para ${contact.nome} via ${instance.name}: ${err instanceof Error ? err.message : 'Desconhecido'}`, "error", "BROADCAST");
      }
    }

    setIsSending(false);
    addLog(`Transmissão Master finalizada (${instance.name}): ${successCount} enviados, ${errorCount} falhas.`, "success", "BROADCAST");
    setBroadcastMsg('');
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fadeIn pb-20">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        <div className="lg:col-span-1 space-y-6">
          <div className="glass-panel rounded-3xl p-6 border border-white/5 relative overflow-hidden bg-slate-950/40">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center justify-between">
              Status Conexão
              <button onClick={initializeEvolution} className={`text-emerald-500 hover:rotate-180 transition-transform duration-500 ${loading ? 'animate-spin' : ''}`}>🔄</button>
            </h3>
            
            <div className="space-y-4">
              {/* Instance Selector */}
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest pl-1">Selecione a Instância</label>
                <select 
                  value={instance?.name || ''}
                  onChange={(e) => handleInstanceChange(e.target.value)}
                  disabled={loading || isSending}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-xs font-bold text-white focus:outline-none focus:border-emerald-500/50 appearance-none cursor-pointer"
                >
                  <option value="" disabled>Escolha uma instância...</option>
                  {availableInstances.length > 0 ? (
                    availableInstances.map((item: any) => (
                      <option key={item.instanceName} value={item.instanceName}>
                        {item.instanceName} ({item.status === 'open' || item.connectionStatus === 'open' ? 'ON' : 'OFF'})
                      </option>
                    ))
                  ) : (
                    <option value={instance?.name}>{instance?.name} (Ativa)</option>
                  )}
                </select>
              </div>

              <div className="flex items-center gap-4 bg-black/40 p-4 rounded-2xl border border-white/5 relative group">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl transition-all ${instance?.status === 'open' ? 'bg-emerald-500/20 text-emerald-500 shadow-[0_0_15px_#10b98155]' : 'bg-red-500/20 text-red-500'}`}>
                  {instance?.status === 'open' ? '📱' : '📵'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] font-black uppercase text-white truncate">Instância: <span className="text-red-500">{instance?.name || '---'}</span></div>
                  <div className="text-[10px] font-mono text-slate-500 truncate">{instance?.number || 'Desconectado'}</div>
                  <div className="text-[9px] font-black uppercase mt-1">
                    {instance?.status === 'open' ? <span className="text-emerald-500">CONECTADO</span> : <span className="text-red-500 animate-pulse">DESCONECTADO</span>}
                  </div>
                </div>
                {instance?.status !== 'open' && !loading && (
                  <button onClick={() => instance && handleInstanceChange(instance.name)} className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 flex items-center justify-center rounded-2xl transition-all font-black text-[10px] text-red-500">
                    TENTAR RECONECTAR
                  </button>
                )}
              </div>

              <button 
                onClick={syncEvolutionChats}
                disabled={isSyncing || instance?.status !== 'open'}
                className="w-full py-3 bg-emerald-600/10 border border-emerald-500/30 text-emerald-500 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-emerald-600 hover:text-white transition-all disabled:opacity-30"
              >
                {isSyncing ? "VARRENDO CHATS..." : "SINCRONIZAR CHATS ATIVOS"}
              </button>
            </div>
          </div>

          <div className="glass-panel rounded-3xl p-6 border border-white/5 bg-slate-900/40">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4">Gestão de Listas</h3>
            <div className="space-y-4">
              <input 
                type="text" 
                placeholder="Nome para nova lista..."
                value={listName}
                onChange={(e) => setListName(e.target.value)}
                className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-xs font-bold text-white focus:outline-none focus:border-red-500/50"
              />
              <button 
                onClick={saveCurrentList}
                disabled={filteredContacts.length === 0}
                className="w-full py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl text-[9px] font-black uppercase border border-white/10 transition-all disabled:opacity-30"
              >
                SALVAR FILTRO ATUAL
              </button>
            </div>

            {savedLists.length > 0 && (
              <div className="mt-6 pt-6 border-t border-white/5 space-y-3">
                <h4 className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Listas Salvas</h4>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-2 scrollbar-thin">
                  {savedLists.map(list => (
                    <div key={list.id} className="flex gap-2 group">
                      <button 
                        onClick={() => { setActiveListId(list.id); setSelectedCategory(''); }}
                        className={`flex-1 text-left px-3 py-2 rounded-xl text-[10px] font-bold border transition-all flex items-center justify-between ${
                          activeListId === list.id 
                            ? 'bg-red-600/20 border-red-500 text-red-500' 
                            : 'bg-black/20 border-white/5 text-slate-400 hover:text-white hover:border-white/20'
                        }`}
                      >
                        <span className="truncate max-w-[120px]">{list.name}</span>
                        <span className="text-[8px] font-mono opacity-60">({list.contacts.length})</span>
                      </button>
                      <button 
                        onClick={() => deleteList(list.id)}
                        className="w-8 h-8 flex items-center justify-center bg-red-900/10 border border-red-500/20 text-red-500 rounded-lg hover:bg-red-600 hover:text-white transition-all opacity-40 group-hover:opacity-100"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="glass-panel rounded-3xl p-6 border border-white/5 bg-slate-900/40">
             <div className="flex justify-between items-center mb-4">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Gestão de Templates</h3>
                <button 
                  onClick={() => setShowTemplateEditor(!showTemplateEditor)}
                  className="text-emerald-500 hover:text-emerald-400 transition-colors"
                >
                  {showTemplateEditor ? '✕' : '+'}
                </button>
             </div>

             {showTemplateEditor && (
                <div className="space-y-3 mb-6 animate-slideInDown p-4 bg-black/20 rounded-2xl border border-white/5">
                   <input 
                      type="text" 
                      placeholder="Título do Template"
                      value={templateTitle}
                      onChange={(e) => setTemplateTitle(e.target.value)}
                      className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2 text-xs font-bold text-white focus:outline-none focus:border-red-500/50"
                   />
                   <div className="text-[8px] font-bold text-slate-500 uppercase tracking-tighter text-center">
                     Dica: Use [NOME] e [DATA] para personalização neural.
                   </div>
                   <button 
                      onClick={addTemplate}
                      disabled={!broadcastMsg.trim() || !templateTitle.trim()}
                      className="w-full py-2 bg-emerald-600 text-white rounded-xl text-[9px] font-black uppercase transition-all disabled:opacity-30"
                   >
                     SALVAR TEMPLATE
                   </button>
                </div>
             )}

             <div className="space-y-2 max-h-64 overflow-y-auto pr-2 scrollbar-thin">
                {templates.map(t => (
                  <div key={t.id} className="relative group">
                    <button 
                      onClick={() => setBroadcastMsg(t.content)}
                      className={`w-full text-left p-3 rounded-xl border transition-all flex flex-col gap-1 ${
                        broadcastMsg === t.content 
                          ? 'bg-emerald-600/20 border-emerald-500' 
                          : 'bg-black/20 border-white/5 hover:border-white/20'
                      }`}
                    >
                      <span className="text-[10px] font-black text-white uppercase truncate">{t.title}</span>
                      <span className="text-[8px] font-medium text-slate-500 line-clamp-2">{t.content}</span>
                    </button>
                    <button 
                      onClick={(e) => deleteTemplate(t.id, e)}
                      className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center bg-red-900/20 border border-red-500/20 text-red-500 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 hover:text-white"
                    >
                      ✕
                    </button>
                  </div>
                ))}
             </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="glass-panel rounded-3xl p-8 border border-white/5 shadow-2xl relative overflow-hidden bg-slate-950/20">
            <h2 className="text-2xl font-black tracking-tighter mb-8 flex items-center gap-4 uppercase">
              <span className="text-emerald-500">⚡</span>
              Broadcast Master Evolution
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">1. Seleção de Público</label>
                <div className="flex gap-2">
                  {['FORNECEDOR', 'CLIENTE', 'TRANSPORTADOR'].map(cat => (
                    <button
                      key={cat}
                      onClick={() => { setSelectedCategory(cat); setActiveListId(null); }}
                      className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase border transition-all ${
                        selectedCategory === cat && !activeListId
                          ? 'bg-emerald-600 border-emerald-500 text-white shadow-lg' 
                          : 'bg-slate-900 border-white/5 text-slate-500'
                      }`}
                    >
                      {cat}s
                    </button>
                  ))}
                </div>
                
                <div className={`p-4 rounded-2xl border flex justify-between items-center transition-all ${activeListId ? 'bg-red-600/5 border-red-500/30' : 'bg-black/20 border-white/5'}`}>
                  <div className="flex flex-col">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Alvos Identificados:</span>
                    <span className={`text-[8px] font-mono ${activeListId ? 'text-red-500' : 'text-emerald-500'} font-bold`}>
                      {activeListId ? `USANDO LISTA: ${savedLists.find(l => l.id === activeListId)?.name}` : `CATEGORIA: ${selectedCategory}`}
                    </span>
                  </div>
                  <span className={`text-2xl font-black ${activeListId ? 'text-red-500' : 'text-emerald-500'} font-mono`}>{filteredContacts.length}</span>
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">2. Mensagem Neural</label>
                
                <div className="flex gap-2 mb-2">
                   <button 
                    onClick={() => setBroadcastMsg(prev => prev + ' [NOME]')}
                    className="px-2 py-1 bg-white/5 border border-white/10 rounded text-[8px] font-black text-slate-400 hover:text-white"
                   >
                     + [NOME]
                   </button>
                   <button 
                    onClick={() => setBroadcastMsg(prev => prev + ' [DATA]')}
                    className="px-2 py-1 bg-white/5 border border-white/10 rounded text-[8px] font-black text-slate-400 hover:text-white"
                   >
                     + [DATA]
                   </button>
                </div>

                <textarea
                  value={broadcastMsg}
                  onChange={(e) => setBroadcastMsg(e.target.value)}
                  placeholder="Olá [NOME], aqui é o Anderson da Enside Madeiras..."
                  className="w-full h-32 bg-slate-900/80 border border-white/10 rounded-2xl p-4 text-sm focus:outline-none focus:border-emerald-500 transition-all font-medium text-slate-300 placeholder:text-slate-700 resize-none shadow-inner"
                />
              </div>
            </div>

            {isSending && (
              <div className="mb-8 space-y-2 animate-fadeIn">
                <div className="flex justify-between items-center px-1">
                  <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest animate-pulse">Disparando Sequência Neural...</span>
                  <span className="text-[10px] font-mono text-emerald-500 font-bold">{progress}%</span>
                </div>
                <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden border border-white/10 shadow-inner">
                  <div 
                    className="bg-emerald-500 h-full transition-all duration-1000 shadow-[0_0_15px_#10b981]"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
              </div>
            )}

            <button
              onClick={handleStartBroadcast}
              disabled={isSending || instance?.status !== 'open'}
              className={`w-full py-5 rounded-2xl text-xs font-black uppercase tracking-[0.3em] transition-all flex items-center justify-center gap-4 ${
                isSending || instance?.status !== 'open'
                  ? 'bg-slate-800 text-slate-600 border border-white/5 cursor-not-allowed'
                  : 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-[0_10px_30px_rgba(16,185,129,0.2)] hover:scale-[1.01]'
              }`}
            >
              {isSending ? 'DISPARANDO MENSAGENS...' : 'EXECUTAR TRANSMISSÃO MASTER'}
            </button>
            {instance?.status !== 'open' && (
              <p className="text-center text-[10px] text-red-500 font-black mt-4 uppercase animate-pulse">
                Aviso: Instância {instance?.name || ''} offline. Verifique a conexão na barra lateral.
              </p>
            )}
          </div>

          <div className="glass-panel rounded-3xl border border-white/5 overflow-hidden shadow-xl bg-slate-900/20">
             <div className="p-4 bg-white/[0.02] border-b border-white/5 flex justify-between items-center">
               <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Fila de Disparo (Próximos 15)</span>
               <span className="text-[9px] font-mono text-slate-600">Total: {filteredContacts.length}</span>
             </div>
             <div className="h-48 overflow-y-auto p-4 space-y-2 scrollbar-thin">
                {filteredContacts.length > 0 ? (
                  filteredContacts.slice(0, 15).map((c, i) => (
                    <div key={i} className="flex justify-between items-center text-[10px] font-mono p-3 bg-black/40 rounded-xl border border-white/[0.02] group hover:border-emerald-500/20 transition-all">
                      <div className="flex items-center gap-3">
                         <span className="text-slate-600">#{i + 1}</span>
                         <span className="text-slate-300 uppercase font-black tracking-tight group-hover:text-white transition-colors">{c.nome}</span>
                      </div>
                      <span className="text-emerald-500/80 font-bold group-hover:text-emerald-400">{c.whatsapp}</span>
                    </div>
                  ))
                ) : (
                  <div className="h-full flex flex-col items-center justify-center opacity-20 py-8">
                     <span className="text-4xl mb-2">📡</span>
                     <p className="text-[10px] font-black uppercase">Nenhum alvo selecionado</p>
                  </div>
                )}
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TransmissionManager;