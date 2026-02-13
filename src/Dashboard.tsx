import { useEffect, useState } from "react";

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
  const [traffic, setTraffic] = useState<number>(20);
  const [budget, setBudget] = useState<number>(1000);

  const [inventory, setInventory] = useState<Item[]>([
    { id: "fan_1", kind: "fan", cooling: 10, cost: 100 },
    { id: "ram_1", kind: "ram", memory: 4, cost: 200 }
  ]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTraffic(prev => Math.round(prev * 1.02));

      setServers(prev =>
        prev.map(s => {
          if (!s.online) return s;

          const cpuIncrease = traffic / 200;
          const newCpu = Math.min(100, s.cpu + cpuIncrease);

          const newTemp = Math.max(
            20,
            s.temp + newCpu * 0.03 - s.fanCount * 1.5
          );

          return {
            ...s,
            cpu: Math.round(newCpu),
            temp: Math.round(newTemp)
          };
        })
      );
    }, 1000);

    return () => clearInterval(interval);
  }, [traffic]);

  function onDragStart(e: React.DragEvent, itemId: string) {
    e.dataTransfer.setData("text/plain", itemId);
  }

  function onDrop(e: React.DragEvent, serverId: string) {
    e.preventDefault();
    const itemId = e.dataTransfer.getData("text/plain");
    const item = inventory.find(i => i.id === itemId);
    if (!item) return;

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
  return (
    <div style={{ padding: 20, fontFamily: "Arial" }}>
      <h2>Server Room Savior</h2>

      <div style={{ display: "flex", gap: 20 }}>
        <div>Traffic: {traffic}</div>
        <div>Budget: ₹{budget}</div>
      </div>

      <hr />

      <h3>Servers</h3>
      <div style={{ display: "flex", gap: 20 }}>
        {servers.map(server => (
          <div
            key={server.id}
            onDragOver={e => e.preventDefault()}
            onDrop={e => onDrop(e, server.id)}
            style={{
              border: "1px solid gray",
              padding: 10,
              width: 180
            }}
          >
            <strong>{server.id}</strong>
            <div>CPU: {server.cpu}%</div>
            <div>Temp: {server.temp}°C</div>
            <div>Memory: {server.memory}/{server.maxMemory}</div>
            <div>Fans: {server.fanCount}</div>
            <button
              onClick={() =>
                setServers(prev =>
                  prev.map(s =>
                    s.id === server.id ? { ...s, online: !s.online } : s
                  )
                )
              }
            >
              {server.online ? "Restart" : "Bring Online"}
            </button>
          </div>
        ))}
      </div>

      <hr />

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
              cursor: "grab"
            }}
          >
            {item.kind.toUpperCase()} — ₹{item.cost}
          </div>
        ))}
      </div>
    </div>
  );
}

