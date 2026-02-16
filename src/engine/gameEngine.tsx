import type { DifficultyConfig } from "../config/difficulty";

export type Server = {
  id: string;
  cpu: number;
  temp: number;
  memory: number;
  maxMemory: number;
  fanCount: number;
  online: boolean;
};

export type GameTickResult = {
  servers: Server[];
  newTraffic: number;
  revenue: number;
  errors: number;
  uptime: number;
};

export function runGameTick(
  servers: Server[],
  traffic: number,
  errors: number,
  uptime: number,
  difficulty: DifficultyConfig,
  capacityLevel: number,
  cpuEfficiencyLevel: number,
  coolingLevel: number
): GameTickResult {

  let growthRate = difficulty.trafficBaseGrowth;

  if (traffic > 300) growthRate += 0.01;
  if (traffic > 700) growthRate += 0.02;
  if (traffic > 1200) growthRate += 0.03;

  const newTraffic = Math.round(traffic * growthRate + 1);

  const onlineServers = servers.filter(s => s.online).length;

  const baseCapacity =
    difficulty.capacityPerServer + capacityLevel * 10;

  const capacity = onlineServers * baseCapacity;

  const handledTraffic = Math.min(newTraffic, capacity);

  const performanceRevenue = handledTraffic * 0.4;
  const grossRevenue =
    difficulty.baseRevenue + performanceRevenue;

  const operatingCost =
    onlineServers * difficulty.operatingCostPerServer;

  const netRevenue = Math.floor(grossRevenue - operatingCost);

  let newErrors = errors;
  let newUptime = uptime;

  if (newTraffic > capacity) {
    newErrors += newTraffic - capacity;
    newUptime = Math.max(0, uptime - 0.5);
  }

  const updatedServers = servers.map(server => {
    if (!server.online) return server;

    const loadPerServer =
      onlineServers > 0 ? newTraffic / onlineServers : newTraffic;

    const cpuReductionMultiplier =
      1 - cpuEfficiencyLevel * 0.05;

    const cpuIncrease =
      (loadPerServer / difficulty.cpuDivisor) *
      cpuReductionMultiplier;

    const newCpu = Math.min(100, server.cpu + cpuIncrease);

    const coolingMultiplier =
      1 - coolingLevel * 0.05;

    const newTemp =
      server.temp +
      newCpu * 0.03 * coolingMultiplier -
      server.fanCount * 2.5;

    const overheated = newTemp > difficulty.overheatTemp;

    return {
      ...server,
      cpu: Math.round(newCpu),
      temp: Math.round(newTemp),
      online: overheated ? false : true
    };
  });

  return {
    servers: updatedServers,
    newTraffic,
    revenue: netRevenue,
    errors: newErrors,
    uptime: newUptime
  };
}
