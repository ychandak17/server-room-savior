export type DifficultyConfig = {
    trafficBaseGrowth: number;
    baseRevenue: number;
    capacityPerServer: number;
    operatingCostPerServer: number;
    cpuDivisor: number;
    overheatTemp: number;
};

export const DIFFICULTY_SETTINGS: Record<string, DifficultyConfig> = {
    easy: {
        trafficBaseGrowth: 1.01,
        baseRevenue: 160,
        capacityPerServer: 80,
        operatingCostPerServer: 4,
        cpuDivisor: 110,
        overheatTemp: 100
    },
    medium: {
        trafficBaseGrowth: 1.015,
        baseRevenue: 120,
        capacityPerServer: 70,
        operatingCostPerServer: 6,
        cpuDivisor: 90,
        overheatTemp: 95
    },
    hard: {
        trafficBaseGrowth: 1.025,
        baseRevenue: 80,
        capacityPerServer: 60,
        operatingCostPerServer: 10,
        cpuDivisor: 70,
        overheatTemp: 90
    }
};
