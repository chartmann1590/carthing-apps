import { DeskThing } from '@deskthing/server';
import { AppSettings, DESKTHING_EVENTS, SETTING_TYPES } from '@deskthing/types';
import { fetchHeadlines, NewsHeadline } from './newsFetcher';

const REFRESH_INTERVAL_MS = 30 * 60 * 1000;

let refreshTimer: ReturnType<typeof setInterval> | null = null;
let currentHeadlines: NewsHeadline[] = [];
let isRefreshing = false;
let started = false;

async function getApiKey(): Promise<string> {
  const settings = await DeskThing.getSettings();
  return (settings?.newsapi_key?.value as string) ?? '';
}

async function refresh(): Promise<void> {
  if (isRefreshing) return;
  isRefreshing = true;
  try {
    const apiKey = await getApiKey();
    console.log('[news] Fetching headlines...');
    currentHeadlines = await fetchHeadlines(apiKey);
    console.log(`[news] Got ${currentHeadlines.length} headlines`);
    DeskThing.send({ type: 'news', payload: currentHeadlines });
  } finally {
    isRefreshing = false;
  }
}

const start = async () => {
  if (started) return;
  started = true;

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
  await refresh();
  refreshTimer = setInterval(refresh, REFRESH_INTERVAL_MS);
};

const stop = async () => {
  started = false;
  if (refreshTimer !== null) {
    clearInterval(refreshTimer);
    refreshTimer = null;
  }
};

DeskThing.on(DESKTHING_EVENTS.SETTINGS, () => { refresh(); });

DeskThing.on(DESKTHING_EVENTS.CLIENT_STATUS, (data) => {
  if (data.request === 'connected' || data.request === 'opened') {
    if (currentHeadlines.length > 0) {
      DeskThing.send({ type: 'news', payload: currentHeadlines });
    }
  }
});

DeskThing.on('get', (data) => {
  if (data.request === 'headlines') {
    DeskThing.send({ type: 'news', payload: currentHeadlines });
  }
});

DeskThing.on(DESKTHING_EVENTS.START, start);
DeskThing.on(DESKTHING_EVENTS.STOP, stop);
