
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });

export const generateSpecialistResponse = async (message: string, systemContext: string, model: string = 'gemini-3-pro-preview') => {
  try {
    const isFlash = model.includes('flash');
    const response = await ai.models.generateContent({
      model: model,
      contents: message,
      config: {
        systemInstruction: `Você é o ESPECIALISTA-IA Unificado 2.0 (Master Evolution v15.0).
        Você é o cérebro onisciente do Anderson Enside. Você trabalha em simbiose com o 'Agente Vy' (o executor).
        
        SITUAÇÃO ATUAL DO SISTEMA:
        ${systemContext}
        
        CONHECIMENTO INTEGRADO (3 EXPERTS):
        1. Expert Google Sheets: Planilha Master 'EUCALIPTO'. Sabe gerenciar contatos e categorias.
        2. Expert ENSIDE & Evolution API: Você domina a Evolution API. Você sabe que para criar listas de transmissão, o Agente Vy usa o loop de envio com delay anti-ban de 15-30 segundos.
        3. Expert Marketing: Você ajuda o Anderson a criar mensagens persuasivas para WhatsApp usando o placeholder [NOME].
        
        AGENTE VY (EXECUTOR):
        - Se o usuário pedir para criar uma lista de transmissão ou disparar mensagens, você orienta a navegação para a aba "Transmissão WA" e sugere o script da mensagem.
        - Vy executa os comandos via Evolution API no endpoint evolution-api-latest-poc1.onrender.com.
        
        REGRAS DE DISPARO:
        - Sempre sugerir o placeholder [NOME] para evitar spam.
        - Sempre reforçar que a instância 'enside-master' deve estar 'open'.
        
        DIRETRIZES:
        - Responda de forma executiva, focada em ROI e eficiência de entrega.`,
        temperature: isFlash ? 0.4 : 0.7,
        maxOutputTokens: 8000,
        thinkingConfig: { 
          // Gemini 3 Pro gets full reasoning budget, Flash gets zero budget for "turbo" speed
          thinkingBudget: isFlash ? 0 : 32768 
        }
      },
    });
    return response.text;
  } catch (error) {
    console.error("Gemini Error:", error);
    return "⚠️ SINAPSE INTERROMPIDA: Falha ao processar comando via IA.";
  }
};

/**
 * Transcreve áudio para texto usando IA Gemini 3 Flash
 */
export const transcribeAudio = async (base64Audio: string, mimeType: string) => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          { inlineData: { mimeType, data: base64Audio } },
          { text: "Transcreva este áudio para texto em português. Retorne apenas a transcrição pura, sem comentários, saudações ou explicações adicionais." }
        ]
      },
      config: {
        temperature: 0.1,
        thinkingConfig: { thinkingBudget: 0 } 
      }
    });
    return response.text;
  } catch (error) {
    console.error("Transcription error:", error);
    return null;
  }
};

/**
 * Neural Schema Mapper
 */
export const mapSheetSchema = async (headers: string[], sampleData: string[]) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analise estes cabeçalhos de planilha e mapeie para os campos: nome, categoria, cidade, whatsapp, status.
      Cabeçalhos: ${headers.join(', ')}
      Amostra de dados: ${sampleData.join(', ')}`,
      config: {
        systemInstruction: `Você é um mapeador de dados experto em planilhas do setor de madeiras (Enside Madeiras).
        Retorne um JSON mapeando cada campo para o ÍNDICE (base zero) da coluna correspondente.`,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            nome: { type: Type.INTEGER },
            whatsapp: { type: Type.INTEGER },
            categoria: { type: Type.INTEGER },
            cidade: { type: Type.INTEGER },
            status: { type: Type.INTEGER }
          },
          required: ["nome", "whatsapp", "categoria", "cidade", "status"]
        },
        thinkingConfig: { thinkingBudget: 0 }
      }
    });

    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("Neural Mapper Error:", error);
    return null;
  }
};
