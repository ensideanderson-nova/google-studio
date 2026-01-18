
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { generateSpecialistResponse, transcribeAudio } from '../services/geminiService';
import { SheetContact, Aprendizado, SystemEvent, CommandHistoryItem } from '../types';
import { BUSINESS_DATA, MAPPED_SYSTEMS } from '../constants';
import { getEvolutionConfig } from '../services/evolutionService';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface ContextPreset {
  id: string;
  name: string;
  contexts: string[];
  timestamp: string;
}

interface ChatInterfaceProps {
  addLog: (message: string, level: 'info' | 'warn' | 'error' | 'success', module?: string) => void;
  contacts: SheetContact[];
  events: SystemEvent[];
  activeTabLabel: string;
}

const MAX_MESSAGE_LENGTH = 4000;
const MAX_HISTORY_ITEMS = 15;

const ChatInterface: React.FC<ChatInterfaceProps> = ({ addLog, contacts, events, activeTabLabel }) => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([
    { 
      id: 'init',
      role: 'assistant', 
      content: `Saudações, Anderson! Sou o ESPECIALISTA-IA Master v15.0. Conectei todas as camadas neurais para processar seus comandos sobre [${activeTabLabel}]. O que vamos automatizar agora?`,
      timestamp: new Date().toLocaleTimeString()
    }
  ]);
  const [input, setInput] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [selectedContext, setSelectedContext] = useState<Set<string>>(new Set(['sheets', 'business', 'neural', 'activity', 'system', 'history', 'metrics', 'config']));
  const [showContextManager, setShowContextManager] = useState(false);
  const [aiModel, setAiModel] = useState<'gemini-3-pro-preview' | 'gemini-3-flash-preview'>('gemini-3-pro-preview');
  const [inputHistory, setInputHistory] = useState<string[]>([]);
  
  // Perfil Neural (Presets) State
  const [presets, setPresets] = useState<ContextPreset[]>([]);
  const [newPresetName, setNewPresetName] = useState('');
  const [isSavingPreset, setIsSavingPreset] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  const CONTEXT_OPTIONS = [
    { id: 'sheets', label: 'Base de Contatos', icon: '📊', description: 'Dados de fornecedores, clientes e transportadores', stats: `${contacts.length} registros` },
    { id: 'business', label: 'Regras de Negócio', icon: '🪵', description: 'Preços Enside, produtos e cálculos de CCA', stats: 'Tabela v15' },
    { id: 'neural', label: 'Memória Neural', icon: '🧠', description: 'Aprendizados e sinapses persistidas no sistema', stats: '37k+ sinapses' },
    { id: 'activity', label: 'Atividade Recente', icon: '🔴', description: 'Eventos macOS e capturas live do Watchdog', stats: `${events.length} eventos` },
    { id: 'system', label: 'Arquitetura', icon: '⚙️', description: 'Mapeamento de pastas, repositórios e integração', stats: `${MAPPED_SYSTEMS.length} sistemas` },
    { id: 'history', label: 'Histórico de Comandos', icon: '📜', description: 'Log de execuções do Agente Vy e scripts Python', stats: 'Audit ON' },
    { id: 'metrics', label: 'Métricas de Sistema', icon: '📈', description: 'Status do Redis, consumo de RAM e conexões', stats: 'Health: 100%' },
    { id: 'config', label: 'Configurações IA', icon: '🔧', description: 'Parâmetros da Evolution API e chaves master', stats: 'Root Active' },
    { id: 'marketing', label: 'Marketing & ROI', icon: '🚀', description: 'Estratégias de venda e templates anti-ban', stats: 'ROI Optimized' },
    { id: 'security', label: 'Segurança & Logs', icon: '🛡️', description: 'Monitoramento de integridade e acesso root', stats: 'Protected' },
  ];

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping, isTranscribing]);

  useEffect(() => {
    const savedHistory = localStorage.getItem('enside_ai_input_history');
    if (savedHistory) {
      try { setInputHistory(JSON.parse(savedHistory)); } catch (e) { setInputHistory([]); }
    }

    const savedPresets = localStorage.getItem('enside_context_presets');
    if (savedPresets) {
      try { setPresets(JSON.parse(savedPresets)); } catch (e) { setPresets([]); }
    }

    const lastUsedContext = localStorage.getItem('enside_last_used_context');
    if (lastUsedContext) {
      try { setSelectedContext(new Set(JSON.parse(lastUsedContext))); } catch (e) { /* fallback */ }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('enside_last_used_context', JSON.stringify(Array.from(selectedContext)));
  }, [selectedContext]);

  const saveInputToHistory = (text: string) => {
    if (!text.trim()) return;
    const cleanText = text.trim();
    setInputHistory(prev => {
      const filtered = prev.filter(item => item !== cleanText);
      const updated = [cleanText, ...filtered].slice(0, MAX_HISTORY_ITEMS);
      localStorage.setItem('enside_ai_input_history', JSON.stringify(updated));
      return updated;
    });
  };

  const toggleContext = (id: string) => {
    const next = new Set(selectedContext);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedContext(next);
  };

  const saveNeuralProfile = () => {
    if (!newPresetName.trim()) return;
    const newProfile: ContextPreset = {
      id: Date.now().toString(),
      name: newPresetName.trim().toUpperCase(),
      contexts: Array.from(selectedContext),
      timestamp: new Date().toLocaleString()
    };
    const updated = [newProfile, ...presets];
    setPresets(updated);
    localStorage.setItem('enside_context_presets', JSON.stringify(updated));
    setNewPresetName('');
    setIsSavingPreset(false);
    addLog(`Perfil Neural '${newProfile.name}' arquivado com sucesso.`, 'success', 'BRAIN');
  };

  const loadNeuralProfile = (profile: ContextPreset) => {
    setSelectedContext(new Set(profile.contexts));
    addLog(`Perfil '${profile.name}' carregado. Sincronizando sinapses...`, 'info', 'BRAIN');
  };

  const deleteProfile = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm("Apagar este perfil neural permanentemente?")) {
      const updated = presets.filter(p => p.id !== id);
      setPresets(updated);
      localStorage.setItem('enside_context_presets', JSON.stringify(updated));
      addLog("Perfil removido da memória flash.", "info", "BRAIN");
    }
  };

  const pinToKnowledge = (content: string) => {
    const defaultTitle = `Insight IA: ${content.substring(0, 30)}...`;
    const title = window.prompt("Defina um título para este aprendizado neural:", defaultTitle);
    
    if (title === null) return; 

    const knowledge: Aprendizado[] = JSON.parse(localStorage.getItem('enside_knowledge_base') || '[]');
    const newEntry: Aprendizado = {
      id: Math.random().toString(36).substr(2, 9),
      titulo: title.trim() || defaultTitle,
      conteudo: content,
      data: new Date().toISOString(),
      fonte: 'Brain Interaction',
      tipo: 'automatico'
    };
    localStorage.setItem('enside_knowledge_base', JSON.stringify([newEntry, ...knowledge]));
    addLog(`Insight "${newEntry.titulo}" fixado na Memória Neural!`, "success", "KNOWLEDGE");
  };

  const sendToBroadcast = (content: string) => {
    const selection = window.getSelection()?.toString();
    const finalContent = (selection && content.includes(selection)) ? selection : content;
    
    localStorage.setItem('enside_staged_broadcast_msg', finalContent);
    addLog(`Mensagem neural preparada para transmissão em massa.`, "success", "BRAIN");
    navigate('/broadcast');
  };

  const buildContextString = () => {
    let contextParts = [];
    if (selectedContext.has('sheets')) {
      const sampleData = contacts.slice(0, 10).map(c => `- ${c.nome} (${c.categoria}) | ${c.cidade} | WA: ${c.whatsapp}`).join('\n');
      contextParts.push(`--- FOCO PRIORITÁRIO ---
[ABA_ATIVA]: ${activeTabLabel.toUpperCase()}
[TOTAL_REGISTROS]: ${contacts.length}
[AMOSTRAGEM]:
${sampleData}`);
    }
    if (selectedContext.has('business')) {
      contextParts.push(`[REGRAS_NEGOCIO]: Preços Enside: Mourão 2.20m (${BUSINESS_DATA.prices.mourao_220}), Poste (${BUSINESS_DATA.prices.poste_7m}). CCA: 0.65.`);
    }
    if (selectedContext.has('neural')) {
      contextParts.push(`[MEMORIA_SINAPTICA]: Ativa (37.232 sinapses).`);
    }
    if (selectedContext.has('config')) {
      const evo = getEvolutionConfig();
      contextParts.push(`[SISTEMA_EVOLUTION]: Host: ${evo.baseUrl}, Instance: ${evo.instance}, Key: ${evo.token.substring(0, 8)}...`);
    }
    return contextParts.join('\n\n');
  };

  const handleSend = async (customMessage?: string) => {
    const textToSend = customMessage || input.trim();
    if (!textToSend.trim()) return;
    
    setValidationError(null);
    const userMsg = textToSend;
    saveInputToHistory(userMsg);
    
    setMessages(prev => [...prev, { 
      id: Math.random().toString(36).substr(2, 9),
      role: 'user', 
      content: userMsg,
      timestamp: new Date().toLocaleTimeString()
    }]);
    
    if (!customMessage) setInput('');
    setIsTyping(true);
    addLog(`Processando via ${aiModel.includes('pro') ? 'PRO' : 'FLASH'}...`, 'info', 'BRAIN');

    try {
      const contextSummary = buildContextString();
      const response = await generateSpecialistResponse(userMsg, contextSummary, aiModel);
      setMessages(prev => [...prev, { 
        id: Math.random().toString(36).substr(2, 9),
        role: 'assistant', 
        content: response || "Sem retorno da sinapse.",
        timestamp: new Date().toLocaleTimeString()
      }]);
    } catch (err) {
      setMessages(prev => [...prev, { 
        id: 'err-' + Date.now(),
        role: 'assistant', 
        content: "⚠️ Falha crítica no processamento neural.",
        timestamp: new Date().toLocaleTimeString()
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      setRecordingTime(0);
      timerRef.current = window.setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

      mediaRecorder.ondataavailable = (event) => audioChunksRef.current.push(event.data);
      mediaRecorder.onstop = async () => {
        if (timerRef.current) clearInterval(timerRef.current);
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setIsTranscribing(true);
        addLog("Captura de voz concluída. Iniciando transcrição...", "info", "VOICE");
        
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64 = (reader.result as string).split(',')[1];
          try {
            const text = await transcribeAudio(base64, 'audio/webm');
            if (text) {
              setInput(prev => prev + (prev ? ' ' : '') + text);
              addLog("Transcrição concluída.", "success", "VOICE");
            } else {
              setValidationError("Falha ao transcrever o áudio.");
            }
          } catch (err) {
            addLog("Erro na transcrição de voz.", "error", "VOICE");
          } finally {
            setIsTranscribing(false);
          }
        };
        reader.readAsDataURL(audioBlob);
      };
      
      mediaRecorder.start();
      setIsRecording(true);
      addLog("Microfone Ativo: Gravando...", "info", "VOICE");
    } catch (err) {
      setValidationError("Acesso ao microfone negado.");
      addLog("Erro de hardware de áudio.", "error", "VOICE");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
    }
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="max-w-5xl mx-auto h-[calc(100vh-12rem)] flex flex-col animate-fadeIn">
      <div className="flex justify-between items-center mb-4 px-2">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
             <div className="relative">
                <div className="absolute inset-0 bg-red-600 rounded-full animate-ping opacity-20"></div>
                <div className="relative w-3 h-3 bg-red-600 rounded-full border-2 border-slate-950"></div>
             </div>
             <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
               Sinapses Ativas: <span className="text-red-500">{selectedContext.size}</span> Camadas
             </span>
          </div>
          
          {/* AI Model Selector Toggle */}
          <div className="flex bg-slate-900/80 border border-white/5 rounded-full p-1 shadow-inner ring-1 ring-white/5">
            <button 
              onClick={() => setAiModel('gemini-3-pro-preview')} 
              className={`px-4 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest transition-all ${aiModel === 'gemini-3-pro-preview' ? 'bg-red-600 text-white shadow-lg glow-red' : 'text-slate-500 hover:text-slate-300'}`}
              title="Complex Reasoning (Gemini 3 Pro)"
            >
              PRO Reasoning
            </button>
            <button 
              onClick={() => setAiModel('gemini-3-flash-preview')} 
              className={`px-4 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest transition-all ${aiModel === 'gemini-3-flash-preview' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
              title="Turbo Response (Gemini 3 Flash)"
            >
              FLASH Turbo
            </button>
          </div>
        </div>
        <button onClick={() => setShowContextManager(!showContextManager)} className={`text-[9px] font-black uppercase px-5 py-2 rounded-full border transition-all ${showContextManager ? 'bg-red-600 border-red-500 text-white shadow-lg glow-red' : 'bg-slate-900 border-white/10 text-slate-400 hover:text-white'}`}>
          {showContextManager ? '✕ Fechar Profile' : '⚙️ Contexto Master'}
        </button>
      </div>

      {showContextManager && (
        <div className="glass-panel rounded-3xl border border-white/10 p-6 mb-6 animate-slideInDown shadow-2xl bg-slate-900/95 relative overflow-hidden">
           <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-8">
            {CONTEXT_OPTIONS.map(opt => {
              const isSelected = selectedContext.has(opt.id);
              return (
                <button
                  key={opt.id}
                  onClick={() => toggleContext(opt.id)}
                  className={`group p-4 rounded-2xl border transition-all flex flex-col items-center text-center gap-2 relative overflow-hidden ${isSelected ? 'bg-red-600/10 border-red-500/50 shadow-lg' : 'bg-black/20 border-white/5 opacity-40 grayscale hover:grayscale-0 hover:opacity-100'}`}
                >
                  <div className="text-2xl transition-transform group-hover:scale-110">{opt.icon}</div>
                  <div className={`text-[8px] font-black uppercase tracking-tight ${isSelected ? 'text-red-500' : 'text-slate-500'}`}>{opt.label}</div>
                  <div className="text-[6px] font-mono text-slate-600 uppercase mt-1">{opt.stats}</div>
                  {isSelected && <div className="absolute top-2 right-2 w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse shadow-[0_0_5px_red]"></div>}
                </button>
              );
            })}
           </div>

           <div className="pt-6 border-t border-white/5">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-2">
                   <span className="w-1.5 h-1.5 bg-red-600 rounded-full shadow-[0_0_8px_red]"></span>
                   Perfis Neurais Salvos
                </h4>
                {!isSavingPreset ? (
                  <button onClick={() => setIsSavingPreset(true)} className="text-[9px] font-black uppercase text-red-500 hover:text-white transition-all bg-red-600/10 px-3 py-1.5 rounded-lg border border-red-500/20">
                    + Arquivar Contexto
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <input type="text" placeholder="Nome do Perfil..." autoFocus value={newPresetName} onChange={(e) => setNewPresetName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && saveNeuralProfile()} className="bg-black/40 border border-white/10 rounded-lg px-4 py-1.5 text-[10px] text-white focus:outline-none focus:border-red-500 w-64" />
                    <button onClick={saveNeuralProfile} className="text-emerald-500 text-[10px] bg-emerald-500/10 px-2 rounded-lg border border-emerald-500/20">💾</button>
                    <button onClick={() => setIsSavingPreset(false)} className="text-red-500 text-[10px] bg-red-500/10 px-2 rounded-lg border border-red-500/20">✕</button>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2">
                 {presets.map(p => (
                   <div key={p.id} className="relative group">
                      <button onClick={() => loadNeuralProfile(p)} className="w-full text-left pl-3 pr-8 py-3 rounded-xl border text-[9px] font-black uppercase transition-all truncate bg-white/5 border-white/5 text-slate-400 hover:text-white hover:border-white/20">
                        {p.name}
                      </button>
                      <button onClick={(e) => deleteProfile(p.id, e)} className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 text-red-500 p-1">✕</button>
                   </div>
                 ))}
              </div>
           </div>
        </div>
      )}

      <div className="glass-panel rounded-t-[2.5rem] border border-white/5 flex-1 overflow-y-auto p-8 space-y-8 scrollbar-thin shadow-inner bg-slate-950/40" ref={scrollRef}>
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-slideInUp group/msg`}>
            <div className={`relative max-w-[85%] rounded-[2rem] p-6 shadow-2xl transition-all ${msg.role === 'user' ? 'bg-red-600 text-white rounded-tr-none' : 'bg-slate-900/90 text-slate-200 border border-white/10 rounded-tl-none'}`}>
              <div className="text-[8px] uppercase font-black tracking-widest mb-3 opacity-40 flex justify-between items-center">
                <span>{msg.role === 'user' ? '👑 Anderson Enside' : '🤖 ESPECIALISTA-IA v15.0'}</span>
                <div className="flex items-center gap-2">
                  <div className="hidden group-hover/msg:flex items-center gap-3">
                    <button 
                      onClick={() => navigator.clipboard.writeText(msg.content)} 
                      title="Copiar texto"
                      className="hover:text-white p-1 transition-colors"
                    >
                      📋
                    </button>
                  </div>
                  <span>{msg.timestamp}</span>
                </div>
              </div>
              <div className="text-sm leading-relaxed whitespace-pre-wrap font-medium">{msg.content}</div>
              
              {msg.role === 'assistant' && (
                <div className="mt-4 pt-3 border-t border-white/5 flex justify-end gap-3">
                   <button 
                     onClick={() => sendToBroadcast(msg.content)}
                     className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-400 border border-emerald-500/30 transition-all text-[9px] font-black uppercase tracking-widest group/broadcast"
                     title="Enviar para Transmissão"
                   >
                     <span className="text-[10px] group-hover/broadcast:scale-125 transition-transform">📢</span>
                     Transmitir WA
                   </button>
                   <button 
                     onClick={() => pinToKnowledge(msg.content)}
                     className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-600/20 hover:bg-red-600/40 text-red-400 border border-red-500/30 transition-all text-[9px] font-black uppercase tracking-widest group/btn"
                     title="Salvar na Memória Neural"
                   >
                     <span className="text-[10px] group-hover/btn:scale-125 transition-transform">📌</span>
                     Save Response
                   </button>
                </div>
              )}
            </div>
          </div>
        ))}
        {isTyping && <div className="flex justify-start animate-pulse"><div className="bg-emerald-500/10 rounded-2xl p-4 text-[9px] font-black uppercase text-emerald-500 border border-emerald-500/20">Processando via {aiModel.includes('pro') ? 'PRO Reasoning' : 'FLASH Turbo'}...</div></div>}
        {isTranscribing && <div className="flex justify-start animate-pulse"><div className="bg-blue-500/10 rounded-2xl p-4 text-[9px] font-black uppercase text-blue-400 border border-blue-500/20">Transcrevendo áudio...</div></div>}
      </div>

      <div className="glass-panel border-x border-b border-white/5 p-6 rounded-b-[2.5rem] shadow-2xl bg-slate-950/60 backdrop-blur-xl relative">
        {validationError && <div className="absolute -top-12 left-6 right-6 bg-red-600/90 text-white text-[10px] font-black uppercase px-4 py-2 rounded-xl animate-slideInUp shadow-lg">{validationError}</div>}
        
        {isRecording && (
          <div className="absolute -top-16 left-1/2 -translate-x-1/2 bg-red-600 text-white px-6 py-2 rounded-full flex items-center gap-3 animate-bounce shadow-xl border border-red-500">
             <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
             <span className="text-[10px] font-black uppercase tracking-widest">Gravando: {formatTimer(recordingTime)}</span>
          </div>
        )}

        <div className="flex gap-4">
          <div className="flex-1 relative">
            <input 
              type="text" 
              value={input} 
              onChange={(e) => setInput(e.target.value)} 
              onKeyDown={(e) => e.key === 'Enter' && handleSend()} 
              placeholder={isRecording ? "Gravando hardware de áudio..." : "Enviar comando neural..."} 
              className={`w-full bg-white/5 border rounded-2xl pl-8 pr-36 py-5 text-sm focus:outline-none transition-all font-bold text-white shadow-inner ${isRecording ? 'border-red-500/50 bg-red-500/5' : 'border-white/10 focus:border-red-500/50'}`} 
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
              <button 
                onClick={isRecording ? stopRecording : startRecording} 
                className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-all relative ${isRecording ? 'bg-red-600 border-red-500 text-white' : 'bg-white/5 border-white/10 text-slate-400 opacity-40 hover:opacity-100 hover:text-white'}`}
                title={isRecording ? "Parar Gravação" : "Gravar Comando de Voz"}
              >
                {isRecording ? '⏹️' : '🎤'}
                {isRecording && <div className="absolute inset-0 rounded-xl border-2 border-white animate-ping opacity-20"></div>}
              </button>
              <button onClick={() => handleSend()} className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-emerald-500 opacity-40 hover:opacity-100 transition-all">🚀</button>
            </div>
          </div>
          <button onClick={() => handleSend()} disabled={isTyping || isRecording || isTranscribing || !input.trim()} className="bg-red-600 hover:bg-red-500 text-white px-10 py-5 rounded-2xl text-[10px] font-black uppercase tracking-widest disabled:opacity-30 transition-all active:scale-95 shadow-xl">DISPARAR</button>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
