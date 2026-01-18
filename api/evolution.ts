
import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Evolution API Proxy - ESPECIALISTA-IA Master Evolution
 * Encaminha chamadas para o Render injetando a API Key de forma segura.
 * Suporta extração dinâmica do path via URL sub-roteamento.
 */

const EVOLUTION_CONFIG = {
  url: 'https://evolution-api-latest-poc1.onrender.com',
  apiKey: '23D116F5-A4D3-404F-8D38-66EBF544A44A',
  instance: 'enside'
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Configurar headers de CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, apikey'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Extrair o path da URL: /api/evolution/instance/fetchInstances -> /instance/fetchInstances
  // req.url no Vercel inclui tudo após o domínio
  let targetPath = req.url?.replace('/api/evolution', '') || '/';
  
  // Se houver parâmetros de query no path, eles já estão inclusos em targetPath
  // Caso o path venha vazio ou apenas '/', e exista no body (compatibilidade legada)
  if ((targetPath === '/' || targetPath === '') && req.body?.path) {
    targetPath = req.body.path;
  }

  if (!targetPath || targetPath === '/') {
    return res.status(400).json({ error: 'Caminho de destino não informado (Path required)' });
  }

  const baseUrl = EVOLUTION_CONFIG.url.endsWith('/') 
    ? EVOLUTION_CONFIG.url.slice(0, -1) 
    : EVOLUTION_CONFIG.url;
    
  const fullUrl = `${baseUrl}${targetPath}`;

  try {
    const fetchOptions: RequestInit = {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVOLUTION_CONFIG.apiKey
      }
    };

    if (req.method !== 'GET' && req.method !== 'HEAD' && req.body) {
      // Removemos o campo 'path' do body se ele existir, para não poluir a requisição final
      const cleanedBody = { ...req.body };
      if (cleanedBody.path) delete cleanedBody.path;
      fetchOptions.body = JSON.stringify(cleanedBody);
    }

    const response = await fetch(fullUrl, fetchOptions);
    const contentType = response.headers.get('content-type');
    
    let responseData;
    if (contentType && contentType.includes('application/json')) {
      responseData = await response.json();
    } else {
      responseData = { message: await response.text() };
    }
    
    return res.status(response.status).json(responseData);
  } catch (error) {
    console.error('[PROXY ERROR]:', error);
    return res.status(500).json({ 
      error: 'Falha na comunicação com a Evolution API via Proxy',
      details: error instanceof Error ? error.message : 'Erro desconhecido',
      target: fullUrl
    });
  }
}
