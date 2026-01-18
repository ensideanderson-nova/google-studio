
/**
 * Metrics Service - ESPECIALISTA-IA Master Evolution
 * Prover de métricas de infraestrutura.
 * Implementa padrão de fallback: tenta fetch real -> fallback para simulação.
 */

export interface RedisMemoryPoint {
  time: string;
  usage: number;
  peak: number;
}

export interface RedisClientPoint {
  time: string;
  clients: number;
}

export interface RedisOpsPoint {
  time: string;
  ops: number;
}

export interface RedisSystemInfo {
  fragmentationRatio: number;
  cpuUsage: number;
  uptime: string;
  totalCommands: number;
  evictedKeys: number;
}

/**
 * Busca métricas históricas de memória do Redis.
 */
export const fetchRedisMemoryMetrics = async (range: '1h' | '6h' | '24h' = '24h'): Promise<RedisMemoryPoint[]> => {
  try {
    const response = await fetch(`/api/redis/memory?range=${range}`);
    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    console.debug(`[METRICS] Endpoint /api/redis/memory não disponível. Simulação ativa.`);
  }

  await new Promise(resolve => setTimeout(resolve, 600));
  const now = new Date();
  const points: RedisMemoryPoint[] = [];
  const iterations = range === '24h' ? 24 : range === '6h' ? 12 : 10;
  const timeStep = range === '24h' ? 3600000 : range === '6h' ? 1800000 : 300000;

  for (let i = iterations; i >= 0; i--) {
    const time = new Date(now.getTime() - i * timeStep);
    points.push({
      time: time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      usage: parseFloat((145 + Math.sin((i / iterations) * Math.PI) * 30 + Math.random() * 10).toFixed(2)),
      peak: 210.0
    });
  }
  return points;
};

/**
 * Busca métricas de clientes conectados ao Redis.
 */
export const fetchRedisClientsMetrics = async (range: '1h' | '6h' | '24h' = '24h'): Promise<RedisClientPoint[]> => {
  try {
    const response = await fetch(`/api/redis/clients?range=${range}`);
    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    console.debug(`[METRICS] Endpoint /api/redis/clients não disponível. Simulação ativa.`);
  }

  await new Promise(resolve => setTimeout(resolve, 400));
  const now = new Date();
  const points: RedisClientPoint[] = [];
  for (let i = 12; i >= 0; i--) {
    const time = new Date(now.getTime() - i * 300000);
    points.push({
      time: time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      clients: 42 + Math.floor(Math.random() * 15)
    });
  }
  return points;
};

/**
 * Busca métricas de operações por segundo (Ops/Sec).
 */
export const fetchRedisOpsMetrics = async (range: '1h' | '6h' | '24h' = '24h'): Promise<RedisOpsPoint[]> => {
  try {
    const response = await fetch(`/api/redis/ops?range=${range}`);
    if (response.ok) return await response.json();
  } catch (e) {}

  await new Promise(r => setTimeout(r, 500));
  const now = new Date();
  const points: RedisOpsPoint[] = [];
  for (let i = 15; i >= 0; i--) {
    const time = new Date(now.getTime() - i * 300000);
    points.push({
      time: time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      ops: 800 + Math.floor(Math.random() * 1200)
    });
  }
  return points;
};

/**
 * Busca informações gerais de saúde do Redis.
 */
export const fetchRedisSystemInfo = async (): Promise<RedisSystemInfo> => {
  try {
    const response = await fetch(`/api/redis/info`);
    if (response.ok) return await response.json();
  } catch (e) {}

  return {
    fragmentationRatio: 1.05 + Math.random() * 0.15,
    cpuUsage: 12.5 + Math.random() * 5,
    uptime: "14d 06h 22m",
    totalCommands: 12450890,
    evictedKeys: 42
  };
};

export const getLiveRedisMemoryUpdate = (lastValue: number): RedisMemoryPoint => ({
  time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
  usage: parseFloat(Math.max(120, Math.min(205, lastValue + (Math.random() - 0.45) * 5)).toFixed(2)),
  peak: 210.0
});

export const getLiveRedisClientsUpdate = (lastValue: number): RedisClientPoint => ({
  time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
  clients: Math.max(20, Math.min(100, lastValue + Math.floor(Math.random() * 5) - 2))
});

export const getLiveRedisOpsUpdate = (lastValue: number): RedisOpsPoint => ({
  time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
  ops: Math.max(500, Math.min(5000, lastValue + Math.floor(Math.random() * 400) - 200))
});
