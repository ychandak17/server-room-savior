import { useReducer, useEffect } from "react";
import { runGameTick } from "./engine/gameEngine";
import { DIFFICULTY_SETTINGS } from "./config/difficulty";

type GameStatus = "menu" | "playing" | "gameover";

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

type GameState = {
    servers: Server[];
    traffic: number;
    budget: number;
    errors: number;
    uptime: number;
    revenuePerTick: number;
    coolingLevel: number;
    cpuEfficiencyLevel: number;
    capacityLevel: number;
    difficulty: keyof typeof DIFFICULTY_SETTINGS;
    status: GameStatus;
    inventory: Item[];
};

const createInitialServers = (): Server[] => [
    { id: "S1", cpu: 10, temp: 40, memory: 2, maxMemory: 8, fanCount: 0, online: true },
    { id: "S2", cpu: 15, temp: 45, memory: 3, maxMemory: 8, fanCount: 0, online: true },
    { id: "S3", cpu: 5, temp: 38, memory: 2, maxMemory: 8, fanCount: 0, online: true }
];

const initialGameState: GameState = {
    servers: createInitialServers(),
    traffic: 20,
    budget: 1000,
    errors: 0,
    uptime: 100,
    revenuePerTick: 0,
    coolingLevel: 0,
    cpuEfficiencyLevel: 0,
    capacityLevel: 0,
    difficulty: "easy",
    status: "menu",
    inventory: [
        { id: "fan_1", kind: "fan", cooling: 10, cost: 100 },
        { id: "ram_1", kind: "ram", memory: 4, cost: 200 }
    ]
};

type Action =
    | { type: "START_GAME" }
    | { type: "SET_DIFFICULTY"; payload: keyof typeof DIFFICULTY_SETTINGS }
    | { type: "TICK" }
    | { type: "BUY_SERVER" }
    | { type: "RESTART_SERVER"; payload: string }
    | { type: "BUY_ITEM"; payload: "fan" | "ram" }
    | { type: "APPLY_ITEM"; payload: { serverId: string; itemId: string } }
    | { type: "UPGRADE_COOLING" }
    | { type: "UPGRADE_CPU" }
    | { type: "UPGRADE_CAPACITY" };

function gameReducer(state: GameState, action: Action): GameState {
    const settings = DIFFICULTY_SETTINGS[state.difficulty];

    switch (action.type) {
        case "START_GAME":
            return {
                ...initialGameState,
                difficulty: state.difficulty,
                status: "playing"
            };

        case "SET_DIFFICULTY":
            return {
                ...state,
                difficulty: action.payload
            };

        case "TICK":
            if (state.status !== "playing") return state;

            const result = runGameTick(
                state.servers,
                state.traffic,
                state.errors,
                state.uptime,
                settings,
                state.capacityLevel,
                state.cpuEfficiencyLevel,
                state.coolingLevel
            );

            return {
                ...state,
                servers: result.servers,
                traffic: result.newTraffic,
                budget: state.budget + result.revenue,
                errors: result.errors,
                uptime: result.uptime,
                revenuePerTick: result.revenue,
                status: result.uptime <= 0 ? "gameover" : state.status
            };

        case "BUY_SERVER":
            if (state.budget < 800) return state;

            return {
                ...state,
                budget: state.budget - 800,
                servers: [
                    ...state.servers,
                    {
                        id: `S${state.servers.length + 1}`,
                        cpu: 5,
                        temp: 35,
                        memory: 2,
                        maxMemory: 8,
                        fanCount: 0,
                        online: true
                    }
                ]
            };

        case "RESTART_SERVER":
            if (state.budget < 50) return state;

            return {
                ...state,
                budget: state.budget - 50,
                servers: state.servers.map(s =>
                    s.id === action.payload
                        ? { ...s, online: !s.online, cpu: 0, temp: 40 }
                        : s
                )
            };

        case "BUY_ITEM": {
            const cost = action.payload === "fan" ? 150 : 300;
            if (state.budget < cost) return state;

            const newItem: Item =
                action.payload === "fan"
                    ? { id: `fan_${Date.now()}`, kind: "fan", cooling: 15, cost }
                    : { id: `ram_${Date.now()}`, kind: "ram", memory: 6, cost };
            return {
                ...state,
                budget: state.budget - cost,
                inventory: [...state.inventory, newItem]
            };
        }

        case "APPLY_ITEM": {
            const { serverId, itemId } = action.payload;
            const item = state.inventory.find(i => i.id === itemId);
            if (!item) return state;

            const updatedServers = state.servers.map(s => {
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
            });

            return {
                ...state,
                servers: updatedServers,
                inventory: state.inventory.filter(i => i.id !== itemId)
            };
        }

        case "UPGRADE_COOLING": {
            if (state.coolingLevel >= 5) return state;
            const cost = 500 * (state.coolingLevel + 1);
            if (state.budget < cost) return state;

            return {
                ...state,
                budget: state.budget - cost,
                coolingLevel: state.coolingLevel + 1
            };
        }

        case "UPGRADE_CPU": {
            if (state.cpuEfficiencyLevel >= 5) return state;
            const cost = 600 * (state.cpuEfficiencyLevel + 1);
            if (state.budget < cost) return state;

            return {
                ...state,
                budget: state.budget - cost,
                cpuEfficiencyLevel: state.cpuEfficiencyLevel + 1
            };
        }

        case "UPGRADE_CAPACITY": {
            if (state.capacityLevel >= 5) return state;
            const cost = 800 * (state.capacityLevel + 1);
            if (state.budget < cost) return state;

            return {
                ...state,
                budget: state.budget - cost,
                capacityLevel: state.capacityLevel + 1
            };
        }

        default:
            return state;
    }
}

export default function Dashboard() {
    const [state, dispatch] = useReducer(gameReducer, initialGameState);

    useEffect(() => {
        const interval = setInterval(() => {
            dispatch({ type: "TICK" });
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    function getColor(value: number) {
        if (value > 85) return "red";
        if (value > 60) return "orange";
        return "green";
    }

    if (state.status === "menu") {
        return (
            <div style={{ padding: 40 }}>
                <h1>Server Room Savior</h1>
                <div>
                    Difficulty:
                    <select
                        value={state.difficulty}
                        onChange={e =>
                            dispatch({
                                type: "SET_DIFFICULTY",
                                payload: e.target.value as any
                            })
                        }
                        style={{ marginLeft: 10 }}
                    >
                        <option value="easy">Easy</option>
                        <option value="medium">Medium</option>
                        <option value="hard">Hard</option>
                    </select>
                </div>
                <button onClick={() => dispatch({ type: "START_GAME" })}>
                    Start Game
                </button>
            </div>
        );
    }

    if (state.status === "gameover") {
        return (
            <div style={{ padding: 40 }}>
                <h1>Game Over</h1>
                <p>Final Budget: ₹{state.budget}</p>
                <p>Traffic Reached: {state.traffic}</p>
                <button onClick={() => dispatch({ type: "START_GAME" })}>
                    Play Again
                </button>
            </div>
        );
    }

    return (
        <div style={{ padding: 20 }}>
            <h2>Server Room Savior</h2>

            <div style={{ display: "flex", gap: 20 }}>
                <div>Traffic: {state.traffic}</div>
                <div>Budget: ₹{state.budget}</div>
                <div>Revenue/sec: ₹{state.revenuePerTick}</div>
                <div>Errors: {state.errors}</div>
                <div>Uptime: {state.uptime.toFixed(1)}%</div>
            </div>

            <h3>Servers</h3>
            <div style={{ display: "flex", gap: 20 }}>
                {state.servers.map(server => (
                    <div
                        key={server.id}
                        onDragOver={e => e.preventDefault()}
                        onDrop={e => {
                            e.preventDefault();
                            const itemId = e.dataTransfer.getData("text/plain");
                            dispatch({
                                type: "APPLY_ITEM",
                                payload: { serverId: server.id, itemId }
                            });
                        }}
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

                        <button
                            onClick={() =>
                                dispatch({ type: "RESTART_SERVER", payload: server.id })
                            }
                        >
                            Restart (-₹50)
                        </button>
                    </div>
                ))}
            </div>

            <hr />

            <h3>Shop</h3>

            <button
                disabled={state.budget < 150}
                onClick={() => dispatch({ type: "BUY_ITEM", payload: "fan" })}
            >
                Buy Advanced Fan (-₹150)
            </button>

            <button
                style={{ marginLeft: 10 }}
                disabled={state.budget < 300}
                onClick={() => dispatch({ type: "BUY_ITEM", payload: "ram" })}
            >
                Buy Advanced RAM (-₹300)
            </button>

            <button
                style={{ marginLeft: 10 }}
                disabled={state.budget < 800}
                onClick={() => dispatch({ type: "BUY_SERVER" })}
            >
                Buy New Server (-₹800)
            </button>

            <hr />

            <h3>Permanent Upgrades</h3>

            {/* Cooling */}
            <div style={{ marginBottom: 8 }}>
                Cooling Optimization (Level {state.coolingLevel}/5)
                <button
                    style={{ marginLeft: 10 }}
                    disabled={
                        state.coolingLevel >= 5 ||
                        state.budget < 500 * (state.coolingLevel + 1)
                    }
                    onClick={() => dispatch({ type: "UPGRADE_COOLING" })}
                >
                    Upgrade (-₹{500 * (state.coolingLevel + 1)})
                </button>
            </div>

            {/* CPU */}
            <div style={{ marginBottom: 8 }}>
                CPU Efficiency (Level {state.cpuEfficiencyLevel}/5)
                <button
                    style={{ marginLeft: 10 }}
                    disabled={
                        state.cpuEfficiencyLevel >= 5 ||
                        state.budget < 600 * (state.cpuEfficiencyLevel + 1)
                    }
                    onClick={() => dispatch({ type: "UPGRADE_CPU" })}
                >
                    Upgrade (-₹{600 * (state.cpuEfficiencyLevel + 1)})
                </button>
            </div>

            {/* Capacity */}
            <div style={{ marginBottom: 8 }}>
                Capacity Boost (Level {state.capacityLevel}/5)
                <button
                    style={{ marginLeft: 10 }}
                    disabled={
                        state.capacityLevel >= 5 ||
                        state.budget < 800 * (state.capacityLevel + 1)
                    }
                    onClick={() => dispatch({ type: "UPGRADE_CAPACITY" })}
                >
                    Upgrade (-₹{800 * (state.capacityLevel + 1)})
                </button>
            </div>

            <hr />

            <h3>Inventory</h3>
            <div style={{ display: "flex", gap: 10 }}>
                {state.inventory.map(item => (
                    <div
                        key={item.id}
                        draggable
                        onDragStart={e =>
                            e.dataTransfer.setData("text/plain", item.id)
                        }
                        style={{
                            border: "1px solid black",
                            padding: 8,
                            cursor: "grab"
                        }}
                    >
                        {item.kind.toUpperCase()}
                    </div>
                ))}
            </div>
        </div>
    );
}
