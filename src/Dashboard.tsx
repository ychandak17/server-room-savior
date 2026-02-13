// Dashboard.tsx (simplified)
import React, { useState, useEffect } from 'react';

type Server = {
  id: string;
  cpu: number;      // 0-100
  temp: number;     // degrees
  memory: number;   // GB used
  maxMemory: number;
  fanCount: number;
  online: boolean;
};

type Item = { id: string; kind: 'fan'|'ram'; cooling?: number; memory?: number; cost: number };

const initialServers = (): Server[] => [
  { id: 's1', cpu: 10, temp: 45, memory: 4, maxMemory: 8, fanCount: 0, online: true },
  { id: 's2', cpu: 8, temp: 43, memory: 3, maxMemory: 8, fanCount: 0, online: true },
  { id: 's3', cpu: 5, temp: 40, memory: 2, maxMemory: 8, fanCount: 0, online: true }
];

export default function Dashboard() {
  const [servers, setServers] = useState<Server[]>(initialServers);
  const [traffic, setTraffic] = useState<number>(20);
  const [budget, setBudget] = useState<number>(1000);
  const [inventory, setInventory] = useState<Item[]>([
    { id: 'fan_1', kind: 'fan', cooling: 12, cost: 100 },
    { id: 'ram_8', kind: 'ram', memory: 4, cost: 200 }
  ]);

  // Game loop tick
  useEffect(() => {
    const t = setInterval(() => {
      // simple traffic growth
      setTraffic(t => Math.round(t * 1.01 + 0.5));

      setServers(prev => prev.map(s => {
        if (!s.online) return s;
        // CPU rises with traffic proportionally, dampened by memory and fans
        const loadFactor = traffic / (servers.length * 50 + 1);
        const cpu = Math.min(100, s.cpu + loadFactor * 2);
        // temp increases by cpu and decreases by fans
        const temp = Math.max(20, s.temp + cpu * 0.02 - s.fanCount * 1.8);
        return { ...s, cpu: Math.round(cpu), temp: Math.round(temp) };
      }));
    }, 1000);
    return () => clearInterval(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [traffic, servers.length]);

  // Drag handlers for inventory
  function onDragStart(e: React.DragEvent, itemId: string) {
    e.dataTransfer.setData('text/plain', itemId);
  }

  function onDropToServer(e: React.DragEvent, serverId: string) {
    e.preventDefault();
    const itemId = e.dataTransfer.getData('text/plain');
    const item = inventory.find(i => i.id === itemId);
    if (!item) return;
    // apply item effect
    setServers(prev => prev.map(s => {
      if (s.id !== serverId) return s;
      if (item.kind === 'fan') return { ...s, fanCount: s.fanCount + 1, temp: Math.max(20, s.temp - (item.cooling ?? 8)) };
      if (item.kind === 'ram') return { ...s, memory: Math.min(s.maxMemory, s.memory + (item.memory ?? 2)) };
      return s;
    }));
    // remove item and deduct cost
    setInventory(prev => prev.filter(i => i.id !== itemId));
    setBudget(b => b - item.cost);
  }

  return (
    <div style={{ padding: 16, fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
        <div>Traffic: {traffic}</div>
        <div>Budget: ₹{budget}</div>
      </div>

      <div style={{ display: 'flex', gap: 20 }}>
        <div style={{ width: 420 }}>
          <h3>Server Rack</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {servers.map(s => (
              <div key={s.id}
                   onDragOver={e => e.preventDefault()}
                   onDrop={e => onDropToServer(e, s.id)}
                   style={{ padding: 12, border: '1px solid #ddd', borderRadius: 6 }}>
                <div style={{ fontWeight: 600 }}>{s.id} {s.online ? '' : '(offline)'}</div>
                <div>CPU: {s.cpu}%</div>
                <div>Temp: {s.temp}°C</div>
                <div>Memory: {s.memory}/{s.maxMemory} GB</div>
                <div>Fans: {s.fanCount}</div>
                <button onClick={() => setServers(prev => prev.map(p => p.id === s.id ? { ...p, online: !p.online } : p))}>
                  {s.online ? 'Restart' : 'Bring Online'}
                </button>
              </div>
            ))}
          </div>
        </div>

        <div style={{ width: 260 }}>
          <h3>Inventory</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {inventory.map(it => (
              <div key={it.id}
                   draggable
                   onDragStart={(e) => onDragStart(e, it.id)}
                   style={{ padding: 8, border: '1px solid #ccc', borderRadius: 6 }}>
                <div>{it.kind.toUpperCase()} — ₹{it.cost}</div>
                {it.cooling ? <div>Cooling: {it.cooling}</div> : null}
                {it.memory ? <div>Memory: {it.memory} GB</div> : null}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
