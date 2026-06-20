import React, { useEffect, useState } from 'react';
import { DeskThing } from '@deskthing/client';

interface GasPrices {
  regular: number | null;
  midgrade: number | null;
  premium: number | null;
  weeklyChange: number | null;
}

const fmt = (v: number | null) => (v != null ? `$${v.toFixed(2)}` : '--');

const App: React.FC = () => {
  const [prices, setPrices] = useState<GasPrices | null>(null);

  useEffect(() => {
    DeskThing.send({ type: 'get', request: 'gas' });
    const rm = DeskThing.on('gas', (data) => {
      setPrices(data.payload as GasPrices);
    });
    return () => rm();
  }, []);

  const change = prices?.weeklyChange ?? null;
  const changeColor = change == null ? '' : change > 0 ? 'text-red-400' : 'text-green-400';
  const changeLabel =
    change == null
      ? null
      : `${change >= 0 ? '↑' : '↓'} $${Math.abs(change).toFixed(3)} vs last week`;

  const noData = prices && prices.regular == null && prices.midgrade == null;

  return (
    <div className="bg-gray-950 w-screen h-screen flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-6 py-3 bg-gray-900 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-green-400 text-xs font-bold uppercase tracking-widest">
            Gas Prices
          </span>
        </div>
        <span className="text-gray-500 text-xs">New York State</span>
      </div>

      <div className="flex-1 flex items-center px-8 py-4">
        {!prices ? (
          <div className="w-full flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-500 text-lg">Fetching gas prices...</p>
          </div>
        ) : noData ? (
          <div className="w-full flex flex-col items-center gap-2">
            <p className="text-gray-400 text-xl">No data</p>
            <p className="text-gray-600 text-sm">Set your EIA API key in DeskThing settings</p>
          </div>
        ) : (
          <div className="w-full flex flex-col gap-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-gray-500 text-xs uppercase tracking-widest mb-1">Regular</p>
                <p className="text-white text-7xl font-bold leading-none">{fmt(prices.regular)}</p>
              </div>
              <div className="flex flex-col items-end gap-4 pt-1">
                <div className="text-right">
                  <p className="text-gray-500 text-xs uppercase tracking-widest mb-0.5">
                    Midgrade
                  </p>
                  <p className="text-gray-200 text-3xl font-semibold">{fmt(prices.midgrade)}</p>
                </div>
                <div className="text-right">
                  <p className="text-gray-500 text-xs uppercase tracking-widest mb-0.5">Premium</p>
                  <p className="text-gray-200 text-3xl font-semibold">{fmt(prices.premium)}</p>
                </div>
              </div>
            </div>
            {changeLabel && (
              <p className={`text-sm font-medium ${changeColor}`}>{changeLabel}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
