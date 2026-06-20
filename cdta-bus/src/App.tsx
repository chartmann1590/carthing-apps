import React, { useEffect, useRef, useState } from 'react';
import { DeskThing } from '@deskthing/client';

interface BusArrival {
  line: string;
  destination: string;
  minutes: number | null;
  scheduled: boolean;
}

interface StopArrival {
  stopName: string;
  arrivals: BusArrival[];
}

const CYCLE_MS = 8000;

function fmtMins(m: number | null): string {
  if (m == null) return '?';
  if (m <= 1) return 'Due';
  return `${m}m`;
}

function minsColor(m: number | null): string {
  if (m == null) return 'text-gray-500';
  if (m <= 2) return 'text-red-400';
  if (m <= 5) return 'text-yellow-400';
  return 'text-white';
}

const App: React.FC = () => {
  const [stops, setStops] = useState<StopArrival[]>([]);
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const indexRef = useRef(0);

  useEffect(() => {
    DeskThing.send({ type: 'get', request: 'bus' });
    const rm = DeskThing.on('bus', (data) => {
      const payload = data.payload as StopArrival[];
      if (Array.isArray(payload)) {
        setStops(payload);
        setIndex(0);
        indexRef.current = 0;
      }
    });
    return () => rm();
  }, []);

  useEffect(() => {
    if (stops.length <= 1) return;
    const timer = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        const next = (indexRef.current + 1) % stops.length;
        indexRef.current = next;
        setIndex(next);
        setVisible(true);
      }, 400);
    }, CYCLE_MS);
    return () => clearInterval(timer);
  }, [stops.length]);

  const stop = stops[index] ?? null;

  return (
    <div className="bg-gray-950 w-screen h-screen flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-6 py-3 bg-gray-900 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
          <span className="text-orange-400 text-xs font-bold uppercase tracking-widest">
            CDTA Bus
          </span>
        </div>
        {stops.length > 1 && (
          <span className="text-gray-500 text-xs">
            {index + 1}/{stops.length} stops
          </span>
        )}
      </div>

      <div className="flex-1 flex flex-col px-6 py-5">
        {stops.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <div className="w-8 h-8 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-500 text-lg">Fetching bus times...</p>
            <p className="text-gray-700 text-sm">Set your 511NY key and stop IDs in settings</p>
          </div>
        ) : stop ? (
          <div
            className="flex flex-col h-full transition-opacity duration-400"
            style={{ opacity: visible ? 1 : 0 }}
          >
            <p className="text-orange-300 text-base font-semibold mb-4">{stop.stopName}</p>
            {stop.arrivals.length === 0 ? (
              <p className="text-gray-500 text-lg mt-8 text-center">No arrivals scheduled</p>
            ) : (
              <div className="flex flex-col gap-0">
                {stop.arrivals.slice(0, 4).map((a, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between py-3 border-b border-gray-800"
                  >
                    <div className="flex items-center gap-4">
                      <div className="bg-orange-500 text-black text-sm font-bold px-3 py-1 rounded min-w-[3.5rem] text-center">
                        {a.line}
                      </div>
                      <span className="text-gray-300 text-base truncate max-w-[280px]">
                        {a.destination}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 ml-4 shrink-0">
                      <span className={`text-xl font-bold ${minsColor(a.minutes)}`}>
                        {fmtMins(a.minutes)}
                      </span>
                      {a.scheduled && (
                        <span className="text-gray-700 text-xs">sch</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : null}
      </div>

      {stops.length > 1 && (
        <div className="flex items-center justify-center gap-2 pb-4">
          {stops.map((_, i) => (
            <div
              key={i}
              className={`rounded-full transition-all duration-300 ${
                i === index ? 'bg-orange-400 w-6 h-1.5' : 'bg-gray-700 w-1.5 h-1.5'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default App;
