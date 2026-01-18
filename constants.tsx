
import React from 'react';
import { MappedSystem } from './types';

export const BUSINESS_DATA = {
  name: 'ENSIDE MADEIRAS',
  owner: 'Anderson Enside',
  contacts: 7055,
  suppliers: 1200,
  clients: 2500,
  transporters: 377,
  whatsapp: '5518996540492',
  prices: {
    mourao_220: 'R$18 - R$25',
    poste_7m: 'R$95 - R$120',
    estaca: 'R$8 - R$15',
    tratamento_cca: 'R$300/m³'
  }
};

export const SHEET_TABS = [
  { id: 'master', label: 'EUCALIPTO (Master)', gid: '1689968688', icon: '🌲' },
  { id: 'fretes', label: 'FRETES / LOGÍSTICA', gid: '0', icon: '🚚' },
  { id: 'vendas', label: 'VENDAS / PEDIDOS', gid: '1423456789', icon: '💰' },
  { id: 'prospects', label: 'PROSPECÇÃO', gid: '987654321', icon: '🔍' }
];

export const MAPPED_SYSTEMS: MappedSystem[] = [
  { name: 'ENSIDE_MASTER_v19.0_INTEGRADO', path: '~/Desktop/ENSIDE_SISTEMA_UNIFICADO/', type: 'html' },
  { name: 'ENSIDE-MASTER-v16', path: '~/Desktop/ENSIDE-MASTER-v16', type: 'repo', files: 1240 },
  { name: 'ESPECIALISTA_IA', path: '~/ESPECIALISTA_IA', type: 'folder' },
  { name: 'Evolution API Node', path: '~/Documents/evolution-api', type: 'repo', files: 856 },
  { name: 'Redis Commander', path: 'http://localhost:8081', type: 'repo', icon: '🗄️' },
];

export const COMMANDS = [
  // INTEGRAÇÃO DE SISTEMAS
  { id: 'scan_enside', label: 'Varrer Sistemas Enside', icon: '🔍', description: 'Executa integrador_sistemas.py para mapear HTMLs e pastas ENSIDE no Mac.', category: 'integration' },
  { id: 'scan_github', label: 'Varrer GitHub Repos', icon: '🐙', description: 'Localiza todos os repositórios .git no Desktop e Documentos.', category: 'integration' },
  { id: 'search_banking_docs', label: 'Mapear Docs Bancários', icon: '🏦', description: 'Busca boletos e extratos no iCloud, GDrive e OneDrive, consolidando-os via Vy.', category: 'integration' },
  
  // MONITORAMENTO EM TEMPO REAL
  { id: 'start_monitor', label: 'Watchdog Live', icon: '🔴', description: 'Ativa MONITOR_TEMPO_REAL.py para captura contínua de eventos macOS.', category: 'monitor' },
  { id: 'monitor_terminal', label: 'Vigilância Terminal', icon: '🐚', description: 'Monitora .zsh_history e indexa comandos executados automaticamente.', category: 'monitor' },
  
  // SINCRONIZAÇÃO UNIFICADA
  { id: 'sync_all', label: 'Comando enside-', icon: '🚀', description: 'Sincronização global Master: Mac, iCloud, GDrive, Redis e GitHub.', category: 'sync' },
  { id: 'sync_sheets', label: 'Sincronizar Planilha', icon: '📊', description: 'Sync completo dos 7.055 contatos da base EUCALIPTO.', category: 'sync' },
  { id: 'sync_evolution', label: 'Sync Evolution API', icon: '🔌', description: 'Sincroniza contatos do sistema com as listas da Evolution API.', category: 'sync' },
  
  // NEGÓCIO: ENSIDE MADEIRAS
  { id: 'calc_prices', label: 'Cálculo CCA/Preços', icon: '🪵', description: 'Tabela dinâmica de Mourões, Postes e Estacas (R$18 - R$120).', category: 'business' },
  { id: 'manage_whatsapp', label: 'Envio em Massa', icon: '📱', description: 'Disparo via Evolution API com intervalo anti-ban.', category: 'business' },
  
  // ORGANIZAÇÃO VY (EXECUÇÃO)
  { id: 'vy_cleanup', label: 'Limpeza Agente Vy', icon: '⚡', description: 'O Agente Vy organiza downloads, limpa caches e otimiza o sistema.', category: 'organize' },
  { id: 'full_backup', label: 'Snapshot Redis', icon: '💾', description: 'Backup da memória evolutiva (37k+ aprendizados) para persistência.', category: 'system' },
];

export const SYSTEM_LINKS = [
  { label: 'Sistema Vercel', url: 'https://enside-sistema-9qwborck2-ensideanderson-novas-projects.vercel.app', icon: '🌐' },
  { label: 'Evolution API (enside-master)', url: 'https://evolution-api-latest-poc1.onrender.com', icon: '📱' },
  { label: 'Evolution Manager', url: 'https://evolution-api-latest-poc1.onrender.com/manager/', icon: '🔌' },
  { label: 'Redis Commander', url: 'http://localhost:8081', icon: '🗄️' },
  { label: 'Planilha Master', url: 'https://docs.google.com/spreadsheets/d/1FiP885Or0ncyRG_ZZaAvM2vP0sHhDzhLFYifYLjKyIE/edit', icon: '📊' },
  { label: 'GitHub Project', url: 'https://github.com/ensideanderson-nova/ENSIDE-MASTER-v16', icon: '🐙' },
];
