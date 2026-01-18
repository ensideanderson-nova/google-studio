
export enum SystemStatus {
  IDLE = 'IDLE',
  SCANNING = 'SCANNING',
  LEARNING = 'LEARNING',
  EXECUTING = 'EXECUTING',
  MONITORING = 'MONITORING',
  ERROR = 'ERROR'
}

export interface Aprendizado {
  id: string;
  titulo: string;
  conteudo: string;
  data: string;
  fonte: string;
  tipo: 'manual' | 'automatico' | 'sistema' | 'github' | 'file' | 'negocio';
  caminho?: string;
}

export interface SystemLog {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'success';
  message: string;
  module: string;
}

export interface SystemEvent {
  id: string;
  timestamp: string;
  type: 'FILE_CREATED' | 'FILE_MODIFIED' | 'APP_ACTIVE' | 'TERMINAL_CMD' | 'SYNC_EVENT' | 'BUSINESS_LOG' | 'VY_EXECUTION' | 'SYSTEM_SCAN' | 'WHATSAPP_SENT' | 'SYNC_EVOLUTION';
  source: string;
  details: string;
}

export interface SheetContact {
  nome: string;
  categoria: 'CLIENTE' | 'FORNECEDOR' | 'TRANSPORTADOR';
  cidade: string;
  whatsapp: string;
  status: string;
}

export interface TransmissionList {
  id: string;
  name: string;
  category: string;
  contacts: string[]; // nomes ou números
  lastSent?: string;
}

export interface MessageTemplate {
  id: string;
  title: string;
  content: string;
}

export interface EvolutionInstance {
  name: string;
  status: 'open' | 'close' | 'connecting';
  number?: string;
  apiKey: string;
}

export interface Command {
  id: string;
  label: string;
  icon: string;
  description: string;
  category: 'file' | 'system' | 'web' | 'sync' | 'monitor' | 'search' | 'organize' | 'business' | 'integration';
}

export interface MappedSystem {
  name: string;
  path: string;
  type: 'html' | 'folder' | 'repo';
  files?: number;
  icon?: string;
}

export interface CommandHistoryItem {
  id: string;
  commandId: string;
  label: string;
  timestamp: string;
  status: 'STARTED' | 'COMPLETED' | 'FAILED';
}
