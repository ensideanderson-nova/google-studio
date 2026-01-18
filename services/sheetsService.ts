
/**
 * Sheets Service - ESPECIALISTA-IA Master Evolution
 * Conexão Inteligente e Mapeamento Semântico para ENSIDE MADEIRAS
 */

import { SheetContact } from '../types';
import { mapSheetSchema } from './geminiService';

const SHEET_ID = '1FiP885Or0ncyRG_ZZaAvM2vP0sHhDzhLFYifYLjKyIE';

// Cache para evitar chamadas de IA redundantes
const schemaCache: Record<string, any> = {};

const normalizeHeader = (str: string) => 
  str.toLowerCase()
     .normalize("NFD")
     .replace(/[\u0300-\u036f]/g, "")
     .replace(/[^a-z]/g, "");

export const fetchMasterContacts = async (gid: string): Promise<SheetContact[]> => {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&gid=${gid}`;
  
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Acesso negado à Planilha Master");
    
    const text = await response.text();
    const match = text.match(/google\.visualization\.Query\.setResponse\(([\s\S\w\W]*)\)/);
    if (!match) throw new Error("Formato de resposta inválido");
    
    const json = JSON.parse(match[1]);
    const cols = json.table.cols;
    const rows = json.table.rows;

    if (!rows || rows.length === 0) return [];

    const firstRowValues = rows[0].c.map((cell: any) => cell ? (cell.v || "").toString() : "");
    const headers = cols.map((c: any, i: number) => c.label || firstRowValues[i] || `Coluna ${i}`);
    
    let idxMap: any;

    // 1. Tentar Heurística Local
    const findColIndex = (keywords: string[]) => {
      const normalizedKeywords = keywords.map(k => normalizeHeader(k));
      let idx = cols.findIndex((c: any) => {
        const label = normalizeHeader(c.label || "");
        return label && normalizedKeywords.some(k => label.includes(k));
      });
      if (idx === -1) {
        idx = firstRowValues.findIndex((val: string) => {
          const normalizedVal = normalizeHeader(val);
          return normalizedVal && normalizedKeywords.some(k => normalizedVal.includes(k));
        });
      }
      return idx;
    };

    idxMap = {
      nome: findColIndex(['nome', 'empresa', 'cliente', 'razao', 'fantasia', 'contato']),
      categoria: findColIndex(['categoria', 'cat', 'tipo', 'perfil', 'classe']),
      cidade: findColIndex(['cidade', 'local', 'uf', 'municipio', 'destino', 'origem', 'endereco']),
      whatsapp: findColIndex(['whatsapp', 'fone', 'tel', 'celular', 'telefone', 'contato']),
      status: findColIndex(['status', 'obs', 'situacao', 'fase', 'comentarios'])
    };

    // 2. Se a heurística for inconclusiva, usar Sincronização Neural (IA)
    if (idxMap.nome === -1 || idxMap.whatsapp === -1) {
      if (schemaCache[gid]) {
        idxMap = schemaCache[gid];
      } else {
        console.debug(`[SYNC] Heurística falhou para GID ${gid}. Iniciando Mapeamento Neural...`);
        const sampleRow = rows[1] ? rows[1].c.map((cell: any) => cell ? (cell.v || "").toString() : "") : [];
        const neuralMap = await mapSheetSchema(headers, sampleRow);
        if (neuralMap) {
          idxMap = neuralMap;
          schemaCache[gid] = neuralMap;
        }
      }
    }

    const isFirstRowHeader = Object.values(idxMap).some(idx => {
      if (idx === -1) return false;
      const val = normalizeHeader(firstRowValues[idx as number]);
      return ['nome', 'whatsapp', 'categoria', 'cidade', 'status', 'empresa'].includes(val);
    });

    const startIdx = isFirstRowHeader ? 1 : 0;

    return rows.slice(startIdx).map((row: any) => {
      const getCellValue = (idx: number) => {
        if (idx === -1 || !row.c || !row.c[idx]) return "";
        const cell = row.c[idx];
        if (cell.v === null || cell.v === undefined) return (cell.f || "").toString().trim();
        return cell.v.toString().trim();
      };
      
      const nome = getCellValue(idxMap.nome);
      const rawCat = getCellValue(idxMap.categoria).toUpperCase();
      const cidade = getCellValue(idxMap.cidade);
      const rawWhatsApp = getCellValue(idxMap.whatsapp);
      const status = getCellValue(idxMap.status) || "ATIVO";
      
      // Limpeza agressiva de WhatsApp
      const cleanWhatsApp = rawWhatsApp.replace(/\D/g, '');
      let formattedWhatsApp = cleanWhatsApp;
      if (cleanWhatsApp.length >= 8) {
          // Se não tem DDI 55, adiciona. Se tem, mantém.
          if (!cleanWhatsApp.startsWith('55')) {
              formattedWhatsApp = `55${cleanWhatsApp}`;
          }
      } else {
          formattedWhatsApp = 'S/N';
      }
      
      // Inteligência de Classificação Neural Enside
      let categoria: SheetContact['categoria'] = 'CLIENTE';
      const nLower = nome.toLowerCase();
      
      if (nLower.includes('serraria') || nLower.includes('madeireira') || rawCat.includes('FORN') || rawCat.includes('PROD')) {
        categoria = 'FORNECEDOR';
      } else if (nLower.includes('frete') || nLower.includes('transport') || rawCat.includes('TRANS') || rawCat.includes('LOG')) {
        categoria = 'TRANSPORTADOR';
      }
      
      return {
        nome: nome || 'Registro Indefinido',
        categoria,
        cidade: cidade || 'Local não informado',
        whatsapp: formattedWhatsApp,
        status
      };
    }).filter((c: SheetContact) => c.nome !== 'Registro Indefinido' && c.nome.length > 1);

  } catch (error) {
    console.error("Neural Sync Critical Error:", error);
    throw error;
  }
};
