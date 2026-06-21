import { DeskThing } from '@deskthing/server';
import { AppSettings, DESKTHING_EVENTS, SETTING_TYPES } from '@deskthing/types';
import { fetchCalendarEvents, CalEvent } from './calFetcher';

const REFRESH_INTERVAL_MS = 15 * 60 * 1000;

let refreshTimer: ReturnType<typeof setInterval> | null = null;
let currentEvents: CalEvent[] = [];
let isRefreshing = false;
let started = false;

async function getIcalUrl(): Promise<string> {
  const settings = await DeskThing.getSettings();
  return (settings?.ical_url?.value as string) ?? '';
}

async function refresh(): Promise<void> {
  if (isRefreshing) return;
  isRefreshing = true;
  try {
    const url = await getIcalUrl();
    console.log('[calendar] Fetching calendar events...');
    currentEvents = await fetchCalendarEvents(url);
    console.log(`[calendar] Got ${currentEvents.length} events`);
    DeskThing.send({ type: 'cal', payload: currentEvents });
  } finally {
    isRefreshing = false;
  }
}

const start = async () => {
  if (started) return;
  started = true;

  const settings: AppSettings = {
    ical_url: {
      id: 'ical_url',
      label: 'Calendar ICS URL',
      description:
        'Paste your Google Calendar "Secret address in iCal format" URL here. Found in Calendar Settings → Integrate calendar.',
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
    DeskThing.send({ type: 'cal', payload: currentEvents });
  }
});

DeskThing.on('get', (data) => {
  if (data.request === 'cal') {
    DeskThing.send({ type: 'cal', payload: currentEvents });
  }
});

DeskThing.on(DESKTHING_EVENTS.START, start);
DeskThing.on(DESKTHING_EVENTS.STOP, stop);
