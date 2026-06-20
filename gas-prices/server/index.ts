import { DeskThing } from '@deskthing/server';
import { AppSettings, DESKTHING_EVENTS, SETTING_TYPES } from '@deskthing/types';
import { fetchGasPrices, GasPrices } from './gasFetcher';

const REFRESH_INTERVAL_MS = 6 * 60 * 60 * 1000;

let refreshTimer: ReturnType<typeof setInterval> | null = null;
let currentPrices: GasPrices | null = null;

async function getApiKey(): Promise<string> {
  const settings = await DeskThing.getSettings();
  return (settings?.eia_api_key?.value as string) ?? '';
}

async function refresh(): Promise<void> {
  const apiKey = await getApiKey();
  console.log('[gas-prices] Fetching EIA prices...');
  currentPrices = await fetchGasPrices(apiKey);
  console.log('[gas-prices] Regular:', currentPrices.regular);
  DeskThing.send({ type: 'gas', payload: currentPrices });
}

const start = async () => {
  const settings: AppSettings = {
    eia_api_key: {
      id: 'eia_api_key',
      label: 'EIA API Key',
      description: 'Free key from eia.gov/opendata/ — required to fetch gas prices.',
      type: SETTING_TYPES.STRING,
      value: '',
    },
  };

  DeskThing.initSettings(settings);

  DeskThing.on(DESKTHING_EVENTS.SETTINGS, async () => {
    await refresh();
  });

  DeskThing.on(DESKTHING_EVENTS.CLIENT_STATUS, (data) => {
    if (data.request === 'connected' || data.request === 'opened') {
      if (currentPrices) DeskThing.send({ type: 'gas', payload: currentPrices });
    }
  });

  DeskThing.on('get', (data) => {
    if (data.request === 'gas') {
      DeskThing.send({ type: 'gas', payload: currentPrices });
    }
  });

  await refresh();
  refreshTimer = setInterval(refresh, REFRESH_INTERVAL_MS);
};

const stop = async () => {
  if (refreshTimer !== null) {
    clearInterval(refreshTimer);
    refreshTimer = null;
  }
};

DeskThing.on(DESKTHING_EVENTS.START, start);
DeskThing.on(DESKTHING_EVENTS.STOP, stop);
