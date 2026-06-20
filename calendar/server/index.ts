import { DeskThing } from '@deskthing/server';
import { AppSettings, DESKTHING_EVENTS, SETTING_TYPES } from '@deskthing/types';
import { fetchCalendarEvents, CalEvent } from './calFetcher';

const REFRESH_INTERVAL_MS = 15 * 60 * 1000;

let refreshTimer: ReturnType<typeof setInterval> | null = null;
let currentEvents: CalEvent[] = [];

async function getIcalUrl(): Promise<string> {
  const settings = await DeskThing.getSettings();
  return (settings?.ical_url?.value as string) ?? '';
}

async function refresh(): Promise<void> {
  const url = await getIcalUrl();
  console.log('[calendar] Fetching calendar events...');
  currentEvents = await fetchCalendarEvents(url);
  console.log(`[calendar] Got ${currentEvents.length} events`);
  DeskThing.send({ type: 'cal', payload: currentEvents });
}

const start = async () => {
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

  DeskThing.on(DESKTHING_EVENTS.SETTINGS, async () => {
    await refresh();
  });

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
