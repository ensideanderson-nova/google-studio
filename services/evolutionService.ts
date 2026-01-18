
/**
 * Evolution Service - ESPECIALISTA-IA Master Evolution
 * Agora utiliza o Proxy Serverless /api/evolution para maior segurança e compatibilidade.
 */
import EVOLUTION_CONFIG from '../evolution-integration.js';

export const getEvolutionConfig = () => {
  const saved = localStorage.getItem('enside_evolution_config');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.error("Erro ao carregar config da Evolution API:", e);
    }
  }
  
  return {
    baseUrl: EVOLUTION_CONFIG.url,
    instance: EVOLUTION_CONFIG.instance,
    token: EVOLUTION_CONFIG.apiKey
  };
};

export const saveEvolutionConfig = (config: { baseUrl: string, instance: string, token: string }) => {
  localStorage.setItem('enside_evolution_config', JSON.stringify(config));
};

/**
 * Função auxiliar para chamadas via Proxy
 * Corrigida: Agora concatena o subcaminho na URL do proxy para que o req.url no backend contenha a rota correta.
 */
const proxyCall = async (path: string, method: string = 'GET', body: any = null) => {
  try {
    // Garantimos que o path comece com /
    const sanitizedPath = path.startsWith('/') ? path : `/${path}`;
    
    const response = await fetch(`/api/evolution${sanitizedPath}`, {
      method: method,
      headers: { 'Content-Type': 'application/json' },
      body: (method !== 'GET' && method !== 'HEAD') ? JSON.stringify(body) : undefined
    });
    
    // Fallback caso o proxy retorne erro ou não esteja disponível localmente
    if (!response.ok && response.status === 404) {
      console.warn("[EVOLUTION] Proxy não encontrado (404). Tentando conexão direta...");
      const config = getEvolutionConfig();
      const base = config.baseUrl.endsWith('/') ? config.baseUrl.slice(0, -1) : config.baseUrl;
      const directResponse = await fetch(`${base}${sanitizedPath}`, {
        method,
        headers: { 'Content-Type': 'application/json', 'apikey': config.token },
        body: (method !== 'GET' && method !== 'HEAD') ? JSON.stringify(body) : null
      });
      return await directResponse.json();
    }

    return await response.json();
  } catch (error) {
    console.error(`Erro na chamada para ${path}:`, error);
    throw error;
  }
};

export const fetchAllInstances = async () => {
  try {
    const data = await proxyCall('/instance/fetchInstances');
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("Erro ao buscar instâncias:", error);
    return [];
  }
};

export const fetchInstanceStatus = async (instanceName?: string) => {
  const config = getEvolutionConfig();
  const targetInstance = instanceName || config.instance;
  
  try {
    const data = await proxyCall(`/instance/connectionState/${targetInstance}`);
    
    // Normalização robusta para diferentes versões da Evolution API
    const state = data?.instance?.state || data?.state || 'close';
    const jid = data?.instance?.ownerJid || data?.ownerJid || '';
    
    return {
      instance: targetInstance,
      status: (state === 'open' || state === 'CONNECTED') ? 'open' : 'close',
      number: jid.split('@')[0] || 'Desconectado'
    };
  } catch (error) {
    return { instance: targetInstance, status: 'close', number: 'Erro via Proxy' };
  }
};

export const fetchEvolutionContacts = async (instanceName?: string) => {
  const config = getEvolutionConfig();
  const targetInstance = instanceName || config.instance;
  
  try {
    const chats = await proxyCall(`/chat/findChats/${targetInstance}`);
    if (!Array.isArray(chats)) return [];
    
    return chats.filter((c: any) => {
      const id = c.id || c.remoteJid || '';
      return id.includes('@s.whatsapp.net') && !id.includes('@g.us');
    });
  } catch (error) {
    throw error;
  }
};

export const sendWhatsAppMessage = async (number: string, text: string, instanceName?: string) => {
  const config = getEvolutionConfig();
  const targetInstance = instanceName || config.instance;
  
  let cleanNumber = number.replace(/\D/g, '');
  // Regra Enside: Garantir DDI 55 para números BR sem DDI
  if (cleanNumber.length >= 8 && cleanNumber.length <= 11 && !cleanNumber.startsWith('55')) {
    cleanNumber = `55${cleanNumber}`;
  }

  return await proxyCall(`/message/sendText/${targetInstance}`, 'POST', {
    number: cleanNumber,
    options: { delay: 1200, presence: 'composing', linkPreview: false },
    textMessage: { text: text }
  });
};
