import { DeskThing } from '@deskthing/server';
import { AppSettings, DESKTHING_EVENTS, SETTING_TYPES } from '@deskthing/types';
import { fetchHeadlines, NewsHeadline } from './newsFetcher';

const REFRESH_INTERVAL_MS = 30 * 60 * 1000;

let refreshTimer: ReturnType<typeof setInterval> | null = null;
let currentHeadlines: NewsHeadline[] = [];

async function getApiKey(): Promise<string> {
  const settings = await DeskThing.getSettings();
  return (settings?.newsapi_key?.value as string) ?? '';
}

async function refresh(): Promise<void> {
  const apiKey = await getApiKey();
  console.log('[news] Fetching headlines...');
  currentHeadlines = await fetchHeadlines(apiKey);
  console.log(`[news] Got ${currentHeadlines.length} headlines`);
  DeskThing.send({ type: 'news', payload: currentHeadlines });
}

const start = async () => {
  const settings: AppSettings = {
    newsapi_key: {
      id: 'newsapi_key',
      label: 'NewsAPI.org Key (optional)',
      description: 'Free key from newsapi.org for additional local coverage. Leave blank to use RSS feeds only.',
      type: SETTING_TYPES.STRING,
      value: '',
    },
  };

  DeskThing.initSettings(settings);

  // Re-send headlines when settings change (e.g. user adds API key)
  DeskThing.on(DESKTHING_EVENTS.SETTINGS, async () => {
    await refresh();
  });

  // Push headlines when client connects
  DeskThing.on(DESKTHING_EVENTS.CLIENT_STATUS, (data) => {
    if (data.request === 'connected' || data.request === 'opened') {
      if (currentHeadlines.length > 0) {
        DeskThing.send({ type: 'news', payload: currentHeadlines });
      }
    }
  });

  // Handle explicit request from client on mount
  DeskThing.on('get', (data) => {
    if (data.request === 'headlines') {
      DeskThing.send({ type: 'news', payload: currentHeadlines });
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
