
import React, { useState, useEffect } from 'react';
import { SheetContact } from '../types';
import { SHEET_TABS } from '../constants';

interface SheetsExplorerProps {
  contacts: SheetContact[];
  loading: boolean;
  refreshData: (tab: typeof SHEET_TABS[0]) => void;
  activeTab: typeof SHEET_TABS[0];
}

const SheetsExplorer: React.FC<SheetsExplorerProps> = ({ contacts, loading, refreshData, activeTab }) => {
  const [filter, setFilter] = useState('');
  const [activeCategory, setActiveCategory] = useState<'ALL' | 'CLIENTE' | 'FORNECEDOR' | 'TRANSPORTADOR'>('ALL');
  const [lastSync, setLastSync] = useState<string>('--:--');

  useEffect(() => {
    if (!loading && contacts.length > 0) {
      setLastSync(new Date().toLocaleTimeString());
    }
  }, [loading, contacts]);

  const filtered = contacts.filter(c => {
    const searchStr = `${c.nome} ${c.cidade} ${c.whatsapp}`.toLowerCase();
    const matchesSearch = searchStr.includes(filter.toLowerCase());
    const matchesCategory = activeCategory === 'ALL' || c.categoria === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const getCount = (cat: string) => contacts.filter(c => cat === 'ALL' ? true : c.categoria === cat).length;

  const handleTabChange = (tab: typeof SHEET_TABS[0]) => {
    if (tab.gid === activeTab.gid) return;
    refreshData(tab);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const clearFilters = () => {
    setFilter('');
    setActiveCategory('ALL');
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fadeIn pb-20">
      {/* Tab Selector */}
      <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar scroll-smooth">
        {SHEET_TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab)}
            className={`px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-3 border ${
              activeTab.gid === tab.gid 
                ? 'bg-emerald-600 text-white border-emerald-500 shadow-xl shadow-emerald-600/30' 
                : 'bg-slate-950 text-slate-500 border-white/5 hover:border-white/10 hover:bg-slate-900'
            }`}
          >
            <span className="text-lg">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Control Panel */}
      <div className={`glass-panel p-8 rounded-3xl border transition-all duration-700 relative overflow-hidden ${loading ? 'border-amber-500/30' : 'border-white/5 shadow-2xl'}`}>
        <div className="absolute top-0 right-0 p-8 opacity-5 text-7xl select-none">🗂️</div>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
          <div>
            <h2 className="text-4xl font-black tracking-tighter flex items-center gap-4">
              <span className="text-emerald-500">📊</span>
              Explorer: {activeTab.label}
            </h2>
            <div className="flex items-center gap-4 mt-2">
               <p className="text-[10px] text-slate-500 uppercase tracking-[0.3em] font-black flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${loading ? 'bg-amber-500 animate-ping' : 'bg-emerald-500 animate-pulse'}`}></span>
                IA Ativa no Contexto Master
              </p>
              <span className="w-px h-3 bg-slate-800"></span>
              <p className="text-[9px] font-mono text-slate-600 uppercase">Último Sync: {lastSync}</p>
            </div>
          </div>
          <div className="flex gap-3">
             <button 
               onClick={() => refreshData(activeTab)} 
               disabled={loading}
               className={`px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all flex items-center gap-3 ${
                 loading ? 'bg-slate-900 text-slate-700 border-white/5 cursor-not-allowed' : 'bg-emerald-600 text-white border-emerald-500 shadow-2xl shadow-emerald-600/30 hover:bg-emerald-500'
               }`}
             >
                {loading ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : '⚡'}
                {loading ? 'SINCRONIZANDO...' : 'RECARREGAR DADOS'}
             </button>
          </div>
        </div>

        <div className="mt-10 flex flex-col xl:flex-row gap-6">
           <div className="relative flex-1 group">
              <input 
               type="text" 
               placeholder={`Buscar entre ${filtered.length} registros nesta aba...`} 
               value={filter}
               onChange={(e) => setFilter(e.target.value)}
               className="w-full bg-slate-900/80 border border-white/10 rounded-2xl pl-14 pr-12 py-5 text-sm focus:outline-none focus:border-emerald-500/50 transition-all font-bold text-white shadow-inner"
              />
              <span className="absolute left-6 top-5.5 opacity-30 text-2xl group-focus-within:text-emerald-500 group-focus-within:opacity-100 transition-all">🔍</span>
              {filter && (
                <button 
                  onClick={() => setFilter('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center bg-white/5 border border-white/10 rounded-lg text-slate-500 hover:text-white transition-all"
                >
                  ✕
                </button>
              )}
           </div>
           
           <div className="flex flex-col gap-2">
             <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest pl-2">Filtrar por Categoria</label>
             <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar bg-black/40 p-2 rounded-2xl border border-white/5 h-fit">
                <FilterBtn label="Tudo" active={activeCategory === 'ALL'} count={getCount('ALL')} onClick={() => setActiveCategory('ALL')} color="text-slate-400" />
                <FilterBtn label="Clientes" active={activeCategory === 'CLIENTE'} count={getCount('CLIENTE')} onClick={() => setActiveCategory('CLIENTE')} color="text-emerald-400" />
                <FilterBtn label="Fornecedores" active={activeCategory === 'FORNECEDOR'} count={getCount('FORNECEDOR')} onClick={() => setActiveCategory('FORNECEDOR')} color="text-blue-400" />
                <FilterBtn label="Transporte" active={activeCategory === 'TRANSPORTADOR'} count={getCount('TRANSPORTADOR')} onClick={() => setActiveCategory('TRANSPORTADOR')} color="text-yellow-500" />
             </div>
           </div>
        </div>

        {(filter || activeCategory !== 'ALL') && (
          <div className="mt-6 flex items-center justify-between p-4 bg-emerald-500/5 rounded-2xl border border-emerald-500/10 animate-slideInDown">
            <div className="flex items-center gap-4">
              <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Filtros Ativos:</span>
              <div className="flex gap-2">
                {filter && (
                  <span className="bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full text-[9px] font-bold border border-emerald-500/30">
                    Busca: "{filter}"
                  </span>
                )}
                {activeCategory !== 'ALL' && (
                  <span className="bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full text-[9px] font-bold border border-blue-500/30">
                    Cat: {activeCategory}
                  </span>
                )}
              </div>
            </div>
            <button 
              onClick={clearFilters}
              className="text-[9px] font-black text-slate-500 hover:text-white uppercase transition-colors"
            >
              Limpar Tudo
            </button>
          </div>
        )}
      </div>

      {/* Results Header */}
      <div className="flex justify-between items-center px-4">
        <div className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
          Listagem de Contatos • <span className="text-emerald-500">{filtered.length}</span> resultados encontrados
        </div>
        <div className="text-[9px] font-mono text-slate-600 uppercase">
          Base: {contacts.length} registros totais
        </div>
      </div>

      {/* Data Table */}
      <div className="glass-panel rounded-[2rem] border border-white/5 overflow-hidden shadow-2xl relative min-h-[500px] bg-slate-950/20">
        {loading && (
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-xl z-20 flex flex-col items-center justify-center gap-6">
             <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
             <span className="text-[12px] font-black uppercase tracking-[0.4em] text-emerald-500 animate-pulse">Sincronização Neural...</span>
          </div>
        )}
        
        <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-emerald-600">
          <table className="w-full text-left text-sm border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-white/[0.03] text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 border-b border-white/5">
                <th className="px-8 py-6">Nome / Razão</th>
                <th className="px-8 py-6">Categoria</th>
                <th className="px-8 py-6">Cidade / Destino</th>
                <th className="px-8 py-6">WhatsApp</th>
                <th className="px-8 py-6">Status</th>
                <th className="px-8 py-6 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.03]">
              {filtered.length > 0 ? (
                filtered.map((contact, i) => (
                  <tr key={i} className="hover:bg-emerald-500/[0.04] transition-all group">
                    <td className="px-8 py-5">
                      <div className="font-black text-slate-100 uppercase tracking-tight text-sm">{contact.nome}</div>
                    </td>
                    <td className="px-8 py-5">
                      <span className={`px-3 py-1 rounded-lg text-[9px] font-black tracking-widest border ${
                        contact.categoria === 'TRANSPORTADOR' ? 'bg-yellow-600/10 text-yellow-500 border-yellow-500/20' :
                        contact.categoria === 'FORNECEDOR' ? 'bg-blue-600/10 text-blue-400 border-blue-500/20' : 
                        'bg-emerald-600/10 text-emerald-400 border-emerald-500/20'
                      }`}>
                        {contact.categoria}
                      </span>
                    </td>
                    <td className="px-8 py-5 font-bold text-slate-400 uppercase text-xs">{contact.cidade}</td>
                    <td className="px-8 py-5">
                      <a href={`https://wa.me/${contact.whatsapp}`} target="_blank" rel="noreferrer" className="text-emerald-500 hover:text-emerald-400 font-mono text-xs font-bold underline decoration-emerald-500/30 transition-all">
                        {contact.whatsapp}
                      </a>
                    </td>
                    <td className="px-8 py-5">
                      <span className="text-[10px] font-bold text-slate-500">{contact.status}</span>
                    </td>
                    <td className="px-8 py-5 text-right">
                       <button 
                        onClick={() => copyToClipboard(contact.whatsapp)} 
                        title="Copiar número"
                        className="p-2 bg-white/5 hover:bg-emerald-600/20 rounded-lg text-slate-400 hover:text-emerald-500 transition-all border border-white/5"
                       >
                         📋
                       </button>
                    </td>
                  </tr>
                ))
              ) : !loading && (
                <tr>
                  <td colSpan={6} className="px-8 py-32 text-center">
                    <div className="flex flex-col items-center gap-4 opacity-20">
                      <span className="text-6xl">🔍</span>
                      <p className="text-xs font-black uppercase tracking-widest">Nenhum registro encontrado</p>
                      <button 
                        onClick={clearFilters}
                        className="mt-4 px-6 py-2 bg-emerald-600 text-white rounded-xl text-[9px] font-black uppercase"
                      >
                        Limpar Filtros e Buscar Novamente
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const FilterBtn: React.FC<{ label: string, active: boolean, count: number, onClick: () => void, color: string }> = ({ label, active, count, onClick, color }) => (
  <button 
    onClick={onClick}
    className={`px-6 py-2 rounded-xl flex items-center gap-3 transition-all whitespace-nowrap ${
      active ? 'bg-white/10 text-white shadow-lg border border-white/10' : 'text-slate-600 hover:text-slate-300'
    }`}
  >
    <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
    <span className={`text-[9px] font-mono font-black px-2 py-0.5 rounded bg-black/40 ${color}`}>{count}</span>
  </button>
);

export default SheetsExplorer;
