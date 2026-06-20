import React, { useEffect, useRef, useState } from 'react';
import { DeskThing } from '@deskthing/client';

interface CalEvent {
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  location?: string;
}

const CYCLE_MS = 8000;

function isToday(iso: string): boolean {
  const d = new Date(iso);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

function fmtTime(iso: string, allDay: boolean): string {
  if (allDay) return 'All day';
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function todayLabel(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

const App: React.FC = () => {
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const [loading, setLoading] = useState(true);
  const indexRef = useRef(0);

  useEffect(() => {
    DeskThing.send({ type: 'get', request: 'cal' });
    const rm = DeskThing.on('cal', (data) => {
      const payload = data.payload as CalEvent[];
      if (Array.isArray(payload)) {
        setEvents(payload);
        setIndex(0);
        indexRef.current = 0;
        setLoading(false);
      }
    });
    return () => rm();
  }, []);

  const todayEvents = events.filter((e) => isToday(e.start));
  const displayEvents = todayEvents.length > 0 ? todayEvents : events;

  useEffect(() => {
    if (displayEvents.length <= 1) return;
    const timer = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        const next = (indexRef.current + 1) % displayEvents.length;
        indexRef.current = next;
        setIndex(next);
        setVisible(true);
      }, 400);
    }, CYCLE_MS);
    return () => clearInterval(timer);
  }, [displayEvents.length]);

  const event = displayEvents[index] ?? null;
  const showingToday = todayEvents.length > 0;

  return (
    <div className="bg-gray-950 w-screen h-screen flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-6 py-3 bg-gray-900 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
          <span className="text-blue-400 text-xs font-bold uppercase tracking-widest">
            Calendar
          </span>
        </div>
        <span className="text-gray-400 text-xs">{todayLabel()}</span>
      </div>

      <div className="flex-1 flex flex-col justify-center px-8 py-6">
        {loading ? (
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-500 text-lg">Loading calendar...</p>
          </div>
        ) : displayEvents.length === 0 ? (
          <div className="flex flex-col items-center gap-2">
            <p className="text-gray-300 text-2xl font-medium">Nothing this week</p>
            <p className="text-gray-600 text-sm">Set your ICS URL in DeskThing settings</p>
          </div>
        ) : event ? (
          <div
            className="flex flex-col gap-4 transition-opacity duration-400"
            style={{ opacity: visible ? 1 : 0 }}
          >
            {!showingToday && (
              <p className="text-blue-300 text-xs font-bold uppercase tracking-widest">
                {fmtDate(event.start)}
              </p>
            )}
            <div className="flex items-center gap-3">
              <span className="text-blue-400 text-sm font-bold uppercase tracking-widest">
                {fmtTime(event.start, event.allDay)}
              </span>
              <div className="flex-1 h-px bg-gray-800" />
              {displayEvents.length > 1 && (
                <span className="text-gray-600 text-xs">
                  {index + 1}/{displayEvents.length}
                </span>
              )}
            </div>
            <p className="text-white text-2xl font-semibold leading-snug">{event.title}</p>
            {event.location && (
              <p className="text-gray-500 text-sm truncate">{event.location}</p>
            )}
          </div>
        ) : null}
      </div>

      {displayEvents.length > 1 && (
        <div className="flex items-center justify-center gap-2 pb-4">
          {displayEvents.map((_, i) => (
            <div
              key={i}
              className={`rounded-full transition-all duration-300 ${
                i === index ? 'bg-blue-400 w-6 h-1.5' : 'bg-gray-700 w-1.5 h-1.5'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default App;
