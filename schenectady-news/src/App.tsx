import React, { useEffect, useRef, useState } from 'react';
import { DeskThing } from '@deskthing/client';

interface NewsHeadline {
  title: string;
  source: string;
}

const CYCLE_MS = 10000;

const App: React.FC = () => {
  const [headlines, setHeadlines] = useState<NewsHeadline[]>([]);
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const indexRef = useRef(0);

  useEffect(() => {
    DeskThing.send({ type: 'get', request: 'headlines' });

    const removeListener = DeskThing.on('news', (data) => {
      const payload = data.payload as NewsHeadline[];
      if (Array.isArray(payload) && payload.length > 0) {
        setHeadlines(payload);
        setIndex(0);
        indexRef.current = 0;
      }
    });

    return () => removeListener();
  }, []);

  useEffect(() => {
    if (headlines.length === 0) return;

    const timer = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        const next = (indexRef.current + 1) % headlines.length;
        indexRef.current = next;
        setIndex(next);
        setVisible(true);
      }, 400);
    }, CYCLE_MS);

    return () => clearInterval(timer);
  }, [headlines]);

  const headline = headlines[index];

  return (
    <div className="bg-gray-950 w-screen h-screen flex flex-col overflow-hidden">
      {/* Header bar */}
      <div className="flex items-center justify-between px-6 py-3 bg-gray-900 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
          <span className="text-yellow-400 text-xs font-bold uppercase tracking-widest">
            Local News
          </span>
        </div>
        <span className="text-gray-500 text-xs">Schenectady, NY</span>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col justify-center px-8 py-6">
        {headlines.length === 0 ? (
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-500 text-lg">Fetching local news...</p>
          </div>
        ) : (
          <div
            className="flex flex-col gap-5 transition-opacity duration-400"
            style={{ opacity: visible ? 1 : 0 }}
          >
            <div className="flex items-center gap-3">
              <span className="text-yellow-400 text-sm font-bold uppercase tracking-widest">
                {headline.source}
              </span>
              <div className="flex-1 h-px bg-gray-800" />
            </div>

            <p className="text-white text-2xl font-semibold leading-snug">
              {headline.title}
            </p>
          </div>
        )}
      </div>

      {/* Progress dots */}
      {headlines.length > 0 && (
        <div className="flex items-center justify-center gap-2 pb-4">
          {headlines.map((_, i) => (
            <div
              key={i}
              className={`rounded-full transition-all duration-300 ${
                i === index
                  ? 'bg-yellow-400 w-6 h-1.5'
                  : 'bg-gray-700 w-1.5 h-1.5'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default App;
