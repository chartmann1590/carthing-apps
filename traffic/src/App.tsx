import React, { useEffect, useRef, useState } from 'react';
import { DeskThing } from '@deskthing/client';

interface Route {
  name: string;
  travelTimeMin: number;
  noTrafficMin: number;
  delayMin: number;
  status: 'normal' | 'slow' | 'heavy';
}

const CYCLE_MS = 10000;

function statusColor(s: string): string {
  if (s === 'heavy') return 'text-red-400';
  if (s === 'slow') return 'text-yellow-400';
  return 'text-green-400';
}

function dotColor(s: string): string {
  if (s === 'heavy') return 'bg-red-400';
  if (s === 'slow') return 'bg-yellow-400';
  return 'bg-green-400';
}

function statusLabel(s: string): string {
  if (s === 'heavy') return 'Heavy Traffic';
  if (s === 'slow') return 'Slow';
  return 'Normal';
}

const App: React.FC = () => {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const indexRef = useRef(0);

  useEffect(() => {
    DeskThing.send({ type: 'get', request: 'traffic' });
    const rm = DeskThing.on('traffic', (data) => {
      const payload = data.payload as Route[];
      if (Array.isArray(payload)) {
        setRoutes(payload);
        setIndex(0);
        indexRef.current = 0;
      }
    });
    return () => rm();
  }, []);

  useEffect(() => {
    if (routes.length <= 1) return;
    const timer = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        const next = (indexRef.current + 1) % routes.length;
        indexRef.current = next;
        setIndex(next);
        setVisible(true);
      }, 400);
    }, CYCLE_MS);
    return () => clearInterval(timer);
  }, [routes.length]);

  const route = routes[index] ?? null;

  return (
    <div className="bg-gray-950 w-screen h-screen flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-6 py-3 bg-gray-900 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full animate-pulse ${route ? dotColor(route.status) : 'bg-gray-600'}`}
          />
          <span className="text-gray-200 text-xs font-bold uppercase tracking-widest">
            Traffic
          </span>
        </div>
        {routes.length > 1 && (
          <span className="text-gray-500 text-xs">
            {index + 1} / {routes.length}
          </span>
        )}
      </div>

      <div className="flex-1 flex flex-col justify-center px-8 py-6">
        {routes.length === 0 ? (
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-500 text-lg">Fetching traffic...</p>
            <p className="text-gray-700 text-sm">Set your TomTom key and routes in settings</p>
          </div>
        ) : route ? (
          <div
            className="flex flex-col gap-5 transition-opacity duration-400"
            style={{ opacity: visible ? 1 : 0 }}
          >
            <div className="flex items-center gap-3">
              <span className={`text-sm font-bold uppercase tracking-widest ${statusColor(route.status)}`}>
                {statusLabel(route.status)}
              </span>
              <div className="flex-1 h-px bg-gray-800" />
            </div>
            <p className="text-gray-400 text-sm uppercase tracking-widest">{route.name}</p>
            <div className="flex items-end gap-3">
              <p className="text-white text-7xl font-bold leading-none">{route.travelTimeMin}</p>
              <p className="text-gray-400 text-2xl mb-2">min</p>
              {route.noTrafficMin > 0 && (
                <p className="text-gray-600 text-lg mb-2">({route.noTrafficMin} w/o traffic)</p>
              )}
            </div>
            {route.delayMin > 0 ? (
              <p className="text-red-400 text-base">+{route.delayMin} min delay</p>
            ) : (
              <p className="text-green-400 text-base">No significant delays</p>
            )}
          </div>
        ) : null}
      </div>

      {routes.length > 1 && (
        <div className="flex items-center justify-center gap-2 pb-4">
          {routes.map((_, i) => (
            <div
              key={i}
              className={`rounded-full transition-all duration-300 ${
                i === index ? 'bg-white w-6 h-1.5' : 'bg-gray-700 w-1.5 h-1.5'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default App;
