import { useEffect, useState } from "react";

type DifficultyConfig = {
    trafficBaseGrowth: number;
    baseRevenue: number;
    capacityPerServer: number;
    operatingCostPerServer: number;
    cpuDivisor: number;
    overheatTemp: number;
};

const DIFFICULTY_SETTINGS: Record<string, DifficultyConfig> = {
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


type Server = {
    id: string;
    cpu: number;
    temp: number;
    memory: number;
    maxMemory: number;
    fanCount: number;
    online: boolean;
};

type Item = {
    id: string;
    kind: "fan" | "ram";
    cooling?: number;
    memory?: number;
    cost: number;
};

const createInitialServers = (): Server[] => [
    { id: "S1", cpu: 10, temp: 40, memory: 2, maxMemory: 8, fanCount: 0, online: true },
    { id: "S2", cpu: 15, temp: 45, memory: 3, maxMemory: 8, fanCount: 0, online: true },
    { id: "S3", cpu: 5, temp: 38, memory: 2, maxMemory: 8, fanCount: 0, online: true }
];

export default function Dashboard() {
    const [servers, setServers] = useState<Server[]>(createInitialServers);
    //const [serverOperatingCost] = useState(12);
    const [traffic, setTraffic] = useState<number>(20);
    const [budget, setBudget] = useState<number>(1000);
    const [errors, setErrors] = useState<number>(0);
    const [uptime, setUptime] = useState<number>(100);
    const [revenuePerTick, setRevenuePerTick] = useState<number>(0);
    const [coolingLevel, setCoolingLevel] = useState(0);
    const [cpuEfficiencyLevel, setCpuEfficiencyLevel] = useState(0);
    const [capacityLevel, setCapacityLevel] = useState(0);
    //const baseRevenue = 120;
    const [difficulty, setDifficulty] = useState<keyof typeof DIFFICULTY_SETTINGS>("easy");

    const settings = DIFFICULTY_SETTINGS[difficulty];


    const [inventory, setInventory] = useState<Item[]>([
        { id: "fan_1", kind: "fan", cooling: 10, cost: 100 },
        { id: "ram_1", kind: "ram", memory: 4, cost: 200 }
    ]);

    useEffect(() => {
        const interval = setInterval(() => {
            setTraffic(prevTraffic => {
                let growthRate = settings.trafficBaseGrowth;

                if (prevTraffic > 300) growthRate += 0.01;
                if (prevTraffic > 700) growthRate += 0.02;
                if (prevTraffic > 1200) growthRate += 0.03;

                const newTraffic = Math.round(prevTraffic * growthRate + 1);


                setServers(prevServers => {
                    const onlineServers = prevServers.filter(s => s.online).length;
                    const baseCapacity = settings.capacityPerServer + capacityLevel * 10;
                    const capacity = onlineServers * baseCapacity;

                    // REVENUE CALCULATION
                    const handledTraffic = Math.min(newTraffic, capacity);
                    const performanceRevenue = handledTraffic * 0.6;

                    const operatingCost =
                        onlineServers * settings.operatingCostPerServer;

                    const grossRevenue = settings.baseRevenue + performanceRevenue;

                    const netRevenue = Math.floor(grossRevenue - operatingCost);

                    setRevenuePerTick(netRevenue);
                    setBudget(prev => prev + netRevenue);


                    // ERROR HANDLING
                    if (newTraffic > capacity) {
                        setErrors(prev => prev + (newTraffic - capacity));
                        setUptime(prev => Math.max(0, prev - 0.8));
                    }

                    return prevServers.map(server => {
                        if (!server.online) return server;

                        const loadPerServer =
                            onlineServers > 0 ? newTraffic / onlineServers : newTraffic;
                        const cpuReductionMultiplier = 1 - cpuEfficiencyLevel * 0.05;
                        const cpuIncrease =
                            (loadPerServer / settings.cpuDivisor) * cpuReductionMultiplier;
                        const newCpu = Math.min(100, server.cpu + cpuIncrease);


                        const coolingMultiplier = 1 - coolingLevel * 0.05;

                        const newTemp =
                            server.temp +
                            newCpu * 0.03 * coolingMultiplier -
                            server.fanCount * 2.5;

                        const overheated = newTemp > settings.overheatTemp;


                        return {
                            ...server,
                            cpu: Math.round(newCpu),
                            temp: Math.round(newTemp),
                            online: overheated ? false : true
                        };
                    });
                });

                return newTraffic;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [errors, uptime]);

    useEffect(() => {
        if (uptime <= 0) {
            alert("Company collapsed. You're fired.");
            window.location.reload();
        }
    }, [uptime]);

    function onDragStart(e: React.DragEvent, itemId: string) {
        e.dataTransfer.setData("text/plain", itemId);
    }

    function onDrop(e: React.DragEvent, serverId: string) {
        e.preventDefault();
        const itemId = e.dataTransfer.getData("text/plain");
        const item = inventory.find(i => i.id === itemId);
        if (!item) return;
        if (budget < item.cost) return;

        setServers(prev =>
            prev.map(s => {
                if (s.id !== serverId) return s;

                if (item.kind === "fan") {
                    return { ...s, fanCount: s.fanCount + 1 };
                }

                if (item.kind === "ram") {
                    return {
                        ...s,
                        memory: Math.min(s.maxMemory, s.memory + (item.memory ?? 0))
                    };
                }

                return s;
            })
        );

        setInventory(prev => prev.filter(i => i.id !== itemId));
        setBudget(prev => prev - item.cost);
    }

    function buyUpgrade(type: "fan" | "ram") {
        if (type === "fan") {
            if (budget < 150) return;
            setBudget(prev => prev - 150);
            setInventory(prev => [
                ...prev,
                { id: `fan_${Date.now()}`, kind: "fan", cooling: 15, cost: 150 }
            ]);
        }

        if (type === "ram") {
            if (budget < 300) return;
            setBudget(prev => prev - 300);
            setInventory(prev => [
                ...prev,
                { id: `ram_${Date.now()}`, kind: "ram", memory: 6, cost: 300 }
            ]);
        }
    }

    function buyNewServer() {
        const cost = 800;
        if (budget < cost) return;

        setBudget(prev => prev - cost);

        const newServer: Server = {
            id: `S${servers.length + 1}`,
            cpu: 5,
            temp: 35,
            memory: 2,
            maxMemory: 8,
            fanCount: 0,
            online: true
        };

        setServers(prev => [...prev, newServer]);
    }


    function restartServer(serverId: string) {
        if (budget < 50) return;

        setBudget(prev => prev - 50);

        setServers(prev =>
            prev.map(s =>
                s.id === serverId
                    ? { ...s, online: !s.online, cpu: 0, temp: 40 }
                    : s
            )
        );
    }

    function getColor(value: number) {
        if (value > 85) return "red";
        if (value > 60) return "orange";
        return "green";
    }

    function buyCoolingUpgrade() {
        if (coolingLevel >= 5) return;

        const cost = 500 * (coolingLevel + 1);
        if (budget < cost) return;

        setBudget(prev => prev - cost);
        setCoolingLevel(prev => prev + 1);
    }

    function buyCpuUpgrade() {
        if (cpuEfficiencyLevel >= 5) return;

        const cost = 600 * (cpuEfficiencyLevel + 1);
        if (budget < cost) return;

        setBudget(prev => prev - cost);
        setCpuEfficiencyLevel(prev => prev + 1);
    }

    function buyCapacityUpgrade() {
        if (capacityLevel >= 5) return;

        const cost = 800 * (capacityLevel + 1);
        if (budget < cost) return;

        setBudget(prev => prev - cost);
        setCapacityLevel(prev => prev + 1);
    }


    return (
        <div style={{ padding: 20, fontFamily: "Arial" }}>
            <div style={{ marginBottom: 20 }}>
                Difficulty:
                <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value as any)}
                    style={{ marginLeft: 10 }}
                >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                </select>
            </div>
            <h2>Server Room Savior</h2>

            <div style={{ display: "flex", gap: 30, marginBottom: 20 }}>
                <div>Traffic: {traffic}</div>
                <div>Budget: ₹{budget}</div>
                <div>Revenue/sec: ₹{revenuePerTick}</div>
                <div>Errors: {errors}</div>
                <div>Uptime: {uptime.toFixed(1)}%</div>
            </div>

            <h3>Servers</h3>
            <div style={{ display: "flex", gap: 20 }}>
                {servers.map(server => (
                    <div
                        key={server.id}
                        onDragOver={e => e.preventDefault()}
                        onDrop={e => onDrop(e, server.id)}
                        style={{
                            border: "1px solid gray",
                            padding: 12,
                            width: 200,
                            background: server.online ? "#fff" : "#ddd"
                        }}
                    >
                        <strong>{server.id}</strong>
                        <div>Status: {server.online ? "Online" : "Offline"}</div>

                        <div>CPU</div>
                        <div
                            style={{
                                height: 10,
                                background: getColor(server.cpu),
                                width: `${server.cpu}%`
                            }}
                        />

                        <div>Temp</div>
                        <div
                            style={{
                                height: 10,
                                background: getColor(server.temp),
                                width: `${server.temp}%`
                            }}
                        />

                        <div>Memory: {server.memory}/{server.maxMemory}</div>
                        <div>Fans: {server.fanCount}</div>

                        <button onClick={() => restartServer(server.id)}>
                            Restart (-₹50)
                        </button>
                    </div>
                ))}
            </div>

            <hr />

            <h3>Shop</h3>
            <button onClick={() => buyUpgrade("fan")}>
                Buy Advanced Fan (-₹150)
            </button>

            <button
                style={{ marginLeft: 10 }}
                onClick={() => buyUpgrade("ram")}
            >
                Buy Advanced RAM (-₹300)
            </button>
            <button
                style={{ marginLeft: 10 }}
                onClick={buyNewServer}
            >
                Buy New Server (-₹800)
            </button>

            <hr />
            <h3>Permanent Upgrades</h3>

            <div style={{ marginBottom: 8 }}>
                Cooling Optimization (Level {coolingLevel}/5)
                <button style={{ marginLeft: 10 }} onClick={buyCoolingUpgrade}>
                    Upgrade (-₹{500 * (coolingLevel + 1)})
                </button>
            </div>

            <div style={{ marginBottom: 8 }}>
                CPU Efficiency (Level {cpuEfficiencyLevel}/5)
                <button style={{ marginLeft: 10 }} onClick={buyCpuUpgrade}>
                    Upgrade (-₹{600 * (cpuEfficiencyLevel + 1)})
                </button>
            </div>

            <div style={{ marginBottom: 8 }}>
                Capacity Boost (Level {capacityLevel}/5)
                <button style={{ marginLeft: 10 }} onClick={buyCapacityUpgrade}>
                    Upgrade (-₹{800 * (capacityLevel + 1)})
                </button>
            </div>

            <h3>Inventory</h3>
            <div style={{ display: "flex", gap: 10 }}>
                {inventory.map(item => (
                    <div
                        key={item.id}
                        draggable
                        onDragStart={e => onDragStart(e, item.id)}
                        style={{
                            border: "1px solid black",
                            padding: 8,
                            cursor: "grab",
                            background: "#f4f4f4"
                        }}
                    >
                        {item.kind.toUpperCase()} — ₹{item.cost}
                    </div>
                ))}
            </div>
        </div>
    );
}
