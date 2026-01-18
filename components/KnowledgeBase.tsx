
import React, { useState, useEffect } from 'react';
import { Aprendizado } from '../types';

const INITIAL_KNOWLEDGE: Aprendizado[] = [
  { id: '1', titulo: 'Unificação 2.0: Especialista-IA + Vy', conteudo: 'Agente Vy configurado para execução automática de comandos (Python, JS, Shell). Integração direta com Spotlight e Terminal.', data: '2026-01-13T10:00:00', fonte: 'UNIFICADOR_2.0.py', tipo: 'sistema' },
  { id: '2', titulo: 'Expert Google Sheets: Planilha Master', conteudo: 'Planilha ID 1FiP885Or0ncyRG_ZZaAvM2vP0sHhDzhLFYifYLjKyIE. Contém 7.055 contatos. Regra: Usar Cmd+J para saltar e sempre limpar título antes de renomear.', data: '2026-01-13T09:15:00', fonte: 'Expert Sheets', tipo: 'negocio' },
  { id: '3', titulo: 'Expert Sistema: Evolution API Render', conteudo: 'URL: evolution-api-latest-poc1.onrender.com. API Key Final Janeiro 2026 integrada. Instância: enside.', data: '2026-01-12T22:30:00', fonte: 'Expert ENSIDE System', tipo: 'sistema' },
  { id: '4', titulo: 'Expert Integração: MCPs Claude AI', conteudo: 'Claude Desktop configurado com MCPs (SQLite, Filesystem, Fetch). Caminho: ~/Library/Application Support/Claude.', data: '2026-01-12T15:00:00', fonte: 'Expert AI', tipo: 'automatico' },
  { id: '5', titulo: 'Preços Enside Madeiras v15', conteudo: 'Mourão 2.20m: R$18-25. Poste 7m: R$95-120. Estaca: R$8-15. Tratamento CCA: R$300/m³ (fator 0.65).', data: '2026-01-11T20:45:00', fonte: 'Business Intelligence', tipo: 'negocio' },
  { id: '7', titulo: 'Autoclassificação Neural de Contatos', conteudo: 'Regra Ativa: Qualquer contato cujo nome contenha "serraria" é classificado como FORNECEDOR. Se contiver "frete", é classificado como TRANSPORTADOR. Esta regra tem prioridade sobre os labels originais da planilha.', data: '2026-01-14T08:00:00', fonte: 'Brain Specialist-IA', tipo: 'automatico' },
];

type KnowledgeCategory = 'all' | 'github' | 'file' | 'manual' | 'negocio' | 'sistema' | 'automatico';

const KnowledgeBase: React.FC = () => {
  const [knowledge, setKnowledge] = useState<Aprendizado[]>([]);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<KnowledgeCategory>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tempItem, setTempItem] = useState<Aprendizado | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('enside_knowledge_base');
    if (saved) {
      try {
        setKnowledge(JSON.parse(saved));
      } catch (e) {
        setKnowledge(INITIAL_KNOWLEDGE);
      }
    } else {
      setKnowledge(INITIAL_KNOWLEDGE);
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('enside_knowledge_base', JSON.stringify(knowledge));
    }
  }, [knowledge, isLoaded]);

  const filtered = knowledge.filter(item => {
    const searchTerms = search.toLowerCase().trim().split(/\s+/);
    const itemText = `${item.titulo} ${item.conteudo}`.toLowerCase();
    const matchesSearch = searchTerms.every(term => itemText.includes(term));
    const matchesTab = activeTab === 'all' || item.tipo === activeTab;
    return matchesSearch && matchesTab;
  });

  const highlightText = (text: string, query: string) => {
    if (!query.trim()) return text;
    const terms = query.trim().split(/\s+/);
    const regex = new RegExp(`(${terms.join('|')})`, 'gi');
    const parts = text.split(regex);
    return (
      <>
        {parts.map((part, i) => (
          terms.some(t => part.toLowerCase() === t.toLowerCase()) ? (
            <span key={i} className="bg-red-500/40 text-white rounded px-0.5 font-bold shadow-sm">{part}</span>
          ) : (
            part
          )
        ))}
      </>
    );
  };

  const startEditing = (item: Aprendizado) => {
    setEditingId(item.id);
    setTempItem({ ...item });
    setIsAdding(false);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setTempItem(null);
    setIsAdding(false);
  };

  const saveChanges = () => {
    if (tempItem) {
      if (isAdding) {
        setKnowledge(prev => [tempItem, ...prev]);
      } else {
        setKnowledge(prev => prev.map(k => k.id === tempItem.id ? tempItem : k));
      }
      setEditingId(null);
      setTempItem(null);
      setIsAdding(false);
    }
  };

  const deleteEntry = (id: string) => {
    if (window.confirm("Deseja apagar este aprendizado permanentemente da memória neural?")) {
      setKnowledge(prev => prev.filter(k => k.id !== id));
    }
  };

  const handleAddNew = () => {
    const newItem: Aprendizado = {
      id: Math.random().toString(36).substr(2, 9),
      titulo: '',
      conteudo: '',
      data: new Date().toISOString(),
      fonte: 'Manual Entry',
      tipo: 'manual'
    };
    setTempItem(newItem);
    setEditingId(newItem.id);
    setIsAdding(true);
  };

  const handleTempChange = (field: keyof Aprendizado, value: string) => {
    if (tempItem) {
      setTempItem({ ...tempItem, [field]: value as any });
    }
  };

  if (!isLoaded) return (
    <div className="h-full w-full flex flex-col items-center justify-center gap-4 py-20">
      <div className="w-12 h-12 border-4 border-red-500 border-t-transparent rounded-full animate-spin"></div>
      <span className="text-[10px] font-black uppercase tracking-[0.4em] text-red-500">Acessando Memória Neural...</span>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fadeIn pb-12">
      {/* Search & Header Section */}
      <div className="glass-panel p-8 rounded-3xl border border-white/5 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1.5 h-full bg-red-600 shadow-[0_0_15px_rgba(239,68,68,0.5)]"></div>
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-8 relative z-10">
          <div>
            <h2 className="text-4xl font-black flex items-center gap-4 tracking-tighter">
              <span className="text-red-500">📚</span> 
              Memória Neural <span className="text-white/10 text-xl font-normal">Enside</span>
            </h2>
            <div className="flex items-center gap-4 mt-2">
              <p className="text-[10px] text-slate-500 uppercase tracking-[0.3em] font-black">
                {knowledge.length} Aprendizados Persistidos
              </p>
              {!isAdding && (
                <button 
                  onClick={handleAddNew}
                  className="px-4 py-1 bg-red-600 text-white text-[9px] font-black uppercase rounded-lg hover:bg-red-500 transition-all shadow-lg"
                >
                  + Nova Sinapse
                </button>
              )}
            </div>
          </div>

          <div className="relative w-full xl:max-w-xl">
             <input 
              type="text" 
              placeholder="Buscar por termos no título ou conteúdo..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-900/80 border border-white/10 rounded-2xl pl-14 pr-16 py-5 text-sm focus:outline-none focus:border-red-500/50 focus:ring-2 focus:ring-red-500/10 transition-all font-bold text-white placeholder:text-slate-700 shadow-inner group"
             />
             <span className="absolute left-6 top-5 text-xl opacity-30 group-focus:opacity-100 transition-opacity">🔍</span>
             <div className="absolute right-4 top-4 flex gap-2">
               {search && (
                 <button 
                  onClick={() => setSearch('')}
                  className="px-3 py-2 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all text-[9px] font-black uppercase rounded-lg border border-white/10"
                 >
                   LIMPAR
                 </button>
               )}
               <div className="hidden sm:flex items-center justify-center px-2 py-1 border border-white/10 rounded bg-black/20 text-[8px] text-slate-500 font-bold opacity-40 select-none">
                 ESC
               </div>
             </div>
          </div>
        </div>
      </div>

      {/* Tabs / Filter Controls */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar w-full md:w-auto">
           <TabButton active={activeTab === 'all'} onClick={() => setActiveTab('all')} label="TODOS" />
           <TabButton active={activeTab === 'negocio'} onClick={() => setActiveTab('negocio')} label="NEGÓCIO" />
           <TabButton active={activeTab === 'sistema'} onClick={() => setActiveTab('sistema')} label="SISTEMAS" />
           <TabButton active={activeTab === 'automatico'} onClick={() => setActiveTab('automatico')} label="NEURAL/IA" />
        </div>
        
        <div className="flex items-center gap-4 px-4 py-2 bg-slate-900/50 rounded-xl border border-white/5">
           <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Resultados:</span>
           <span className="text-sm font-mono font-black text-red-500">{filtered.length}</span>
        </div>
      </div>

      {/* Editing Form for Adding or Editing */}
      {editingId && tempItem && (
        <div className="glass-panel rounded-3xl p-8 border border-emerald-500/50 bg-emerald-500/10 animate-slideInDown space-y-6 ring-2 ring-emerald-500/20">
           <div className="flex justify-between items-center mb-6">
              <h3 className="text-xs font-black uppercase text-emerald-500 tracking-[0.3em]">
                {isAdding ? 'Registrar Novo Aprendizado' : `Editando Sinapse: ${tempItem.id}`}
              </h3>
              <div className="flex gap-2">
                <button onClick={saveChanges} className="px-6 py-2 bg-emerald-600 text-white text-[10px] font-black rounded-xl uppercase shadow-xl shadow-emerald-600/30 hover:bg-emerald-500 transition-all">✓ Salvar Alterações</button>
                <button onClick={cancelEditing} className="px-6 py-2 bg-slate-800 text-slate-400 text-[10px] font-black rounded-xl uppercase hover:text-white transition-all">✕ Descartar</button>
              </div>
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Título da Sinapse</label>
                <input 
                  value={tempItem.titulo} 
                  onChange={(e) => handleTempChange('titulo', e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white focus:outline-none focus:border-emerald-500"
                  placeholder="Título do aprendizado"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                   <label className="text-[10px] font-bold text-slate-500 uppercase">Categoria</label>
                   <select 
                      value={tempItem.tipo}
                      onChange={(e) => handleTempChange('tipo', e.target.value as any)}
                      className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-xs font-bold text-white uppercase focus:outline-none focus:border-emerald-500"
                    >
                      <option value="negocio">NEGÓCIO</option>
                      <option value="sistema">SISTEMA</option>
                      <option value="automatico">NEURAL/IA</option>
                      <option value="manual">MANUAL</option>
                      <option value="github">GITHUB</option>
                      <option value="file">ARQUIVO</option>
                    </select>
                 </div>
                 <div className="space-y-2">
                   <label className="text-[10px] font-bold text-slate-500 uppercase">Fonte</label>
                   <input 
                    value={tempItem.fonte} 
                    onChange={(e) => handleTempChange('fonte', e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white focus:outline-none focus:border-emerald-500"
                    placeholder="Fonte de origem"
                   />
                 </div>
              </div>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Data / Timestamp</label>
                <input 
                  type="datetime-local"
                  value={tempItem.data ? new Date(tempItem.data).toISOString().slice(0, 16) : ''} 
                  onChange={(e) => handleTempChange('data', new Date(e.target.value).toISOString())}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Caminho do Arquivo (Opcional)</label>
                <input 
                  value={tempItem.caminho || ''} 
                  onChange={(e) => handleTempChange('caminho', e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white focus:outline-none focus:border-emerald-500"
                  placeholder="/caminho/do/arquivo"
                />
              </div>
           </div>

           <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Conteúdo Neural</label>
              <textarea 
                value={tempItem.conteudo}
                onChange={(e) => handleTempChange('conteudo', e.target.value)}
                rows={6}
                className="w-full bg-slate-950 border border-white/10 rounded-2xl p-4 text-sm text-slate-300 resize-none focus:outline-none focus:border-emerald-500"
                placeholder="Detalhes memorizados..."
              />
           </div>
        </div>
      )}

      {/* Entries List */}
      <div className="grid grid-cols-1 gap-6">
        {filtered.map(item => {
          const isCurrentEditing = editingId === item.id;
          if (isCurrentEditing) return null; // Form above handles active editing item
          
          return (
            <div key={item.id} className={`glass-panel rounded-3xl p-8 border transition-all group relative overflow-hidden shadow-2xl border-white/5 hover:bg-white/[0.02] hover:border-red-500/20`}>
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-6 flex-1">
                   <div className="w-16 h-16 bg-slate-950 border border-white/10 rounded-2xl flex items-center justify-center text-3xl shadow-inner group-hover:scale-110 transition-transform duration-500 flex-shrink-0">
                      {item.tipo === 'negocio' ? '🪵' : item.tipo === 'github' ? '🐙' : item.tipo === 'automatico' ? '🤖' : '🧠'}
                   </div>
                   <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border ${
                          item.tipo === 'negocio' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                          item.tipo === 'sistema' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                          'bg-red-600/10 text-red-500 border-red-500/20'
                        }`}>
                          {item.tipo}
                        </span>
                        <span className="text-[9px] font-mono text-slate-600">{new Date(item.data).toLocaleString()}</span>
                      </div>
                      <h3 className="text-2xl font-black text-slate-100 group-hover:text-red-500 transition-colors tracking-tight uppercase">
                        {highlightText(item.titulo, search)}
                      </h3>
                   </div>
                </div>
                
                <div className="flex gap-2 ml-4">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                     <button 
                      onClick={() => startEditing(item)}
                      title="Editar Sinapse"
                      className="p-2.5 bg-white/5 border border-white/10 text-slate-400 hover:text-white rounded-xl hover:bg-red-600 transition-all"
                     >
                      ✏️
                     </button>
                     <button 
                      onClick={() => deleteEntry(item.id)}
                      title="Remover Sinapse"
                      className="p-2.5 bg-white/5 border border-white/10 text-slate-400 hover:text-red-500 rounded-xl hover:bg-red-900/30 transition-all"
                     >
                      🗑️
                     </button>
                  </div>
                </div>
              </div>
              
              <div className="mb-8">
                <p className="text-base text-slate-400 leading-relaxed font-medium bg-white/[0.01] p-4 rounded-2xl border border-white/[0.02]">
                  {highlightText(item.conteudo, search)}
                </p>
              </div>

              <div className="flex items-center justify-between text-[10px] font-mono font-bold text-slate-600 border-t border-white/5 pt-6">
                 <div className="flex items-center gap-4">
                   <div className={`w-2.5 h-2.5 rounded-full ${item.tipo === 'negocio' ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]' : 'bg-red-600 animate-pulse shadow-[0_0_8px_rgba(220,38,38,0.5)]'}`}></div>
                   <span className="text-slate-500 uppercase">Fonte de Dados:</span> 
                   <span className="text-slate-300 font-black uppercase tracking-tight">{item.fonte}</span>
                 </div>
                 <div className="hidden sm:block opacity-40 italic">
                   SINAPSE_ID: {item.id}
                 </div>
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && !isAdding && (
          <div className="p-32 glass-panel rounded-[3rem] border border-white/5 flex flex-col items-center justify-center text-center bg-slate-950/20">
             <div className="w-24 h-24 bg-slate-900 rounded-full flex items-center justify-center text-5xl opacity-10 border border-white/10 animate-pulse mb-8">
               🧠
             </div>
             <h3 className="text-xl font-black text-slate-500 uppercase tracking-widest mb-3">Memória não localizada</h3>
             <p className="text-sm text-slate-600 max-w-sm leading-relaxed font-medium">
               A busca por "{search}" não retornou registros no cluster neural. Tente palavras-chave mais genéricas.
             </p>
             {search && (
               <button 
                onClick={() => setSearch('')}
                className="mt-8 px-8 py-3 bg-red-600/10 hover:bg-red-600/20 text-red-500 rounded-2xl text-[10px] font-black uppercase border border-red-500/30 transition-all"
               >
                 REDEFINIR BUSCA
               </button>
             )}
          </div>
        )}
      </div>
    </div>
  );
};

const TabButton: React.FC<{ active: boolean, label: string, onClick: () => void }> = ({ active, label, onClick }) => (
  <button 
    onClick={onClick}
    className={`px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap border-2 ${
      active ? 'bg-red-600 text-white border-red-500 shadow-2xl shadow-red-600/30 scale-105' : 'bg-slate-950 text-slate-600 border-white/5 hover:border-white/10'
    }`}
  >
    {label}
  </button>
);

export default KnowledgeBase;
