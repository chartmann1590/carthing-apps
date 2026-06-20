import { DeskThing } from '@deskthing/server';
import { AppSettings, DESKTHING_EVENTS, SETTING_TYPES } from '@deskthing/types';
import { fetchAllStops, StopArrival } from './busFetcher';

const REFRESH_INTERVAL_MS = 60 * 1000;

let refreshTimer: ReturnType<typeof setInterval> | null = null;
let currentStops: StopArrival[] = [];

async function getConfig(): Promise<{ apiKey: string; stops: Array<{ id: string; name: string }> }> {
  const settings = await DeskThing.getSettings();
  const get = (key: string) => (settings?.[key]?.value as string) ?? '';

  return {
    apiKey: get('api_511_key'),
    stops: [
      { id: get('stop1_id'), name: get('stop1_name') },
      { id: get('stop2_id'), name: get('stop2_name') },
      { id: get('stop3_id'), name: get('stop3_name') },
    ],
  };
}

async function refresh(): Promise<void> {
  const { apiKey, stops } = await getConfig();
  if (!apiKey || stops.every((s) => !s.id)) {
    console.log('[bus] No API key or stop IDs configured');
    return;
  }
  currentStops = await fetchAllStops(apiKey, stops);
  DeskThing.send({ type: 'bus', payload: currentStops });
}

const start = async () => {
  const settings: AppSettings = {
    api_511_key: {
      id: 'api_511_key',
      label: '511NY API Key',
      description: 'Free key from 511ny.org/developers — provides real-time CDTA arrivals.',
      type: SETTING_TYPES.STRING,
      value: '',
    },
    stop1_id: {
      id: 'stop1_id',
      label: 'Stop 1 ID',
      description: 'CDTA stop number (find on cdta.org or bus stop sign)',
      type: SETTING_TYPES.STRING,
      value: '',
    },
    stop1_name: {
      id: 'stop1_name',
      label: 'Stop 1 Display Name',
      description: 'e.g. "State & Eagle"',
      type: SETTING_TYPES.STRING,
      value: '',
    },
    stop2_id: {
      id: 'stop2_id',
      label: 'Stop 2 ID (optional)',
      description: 'Leave blank to disable',
      type: SETTING_TYPES.STRING,
      value: '',
    },
    stop2_name: {
      id: 'stop2_name',
      label: 'Stop 2 Display Name',
      description: 'e.g. "Central Ave & Helderberg"',
      type: SETTING_TYPES.STRING,
      value: '',
    },
    stop3_id: {
      id: 'stop3_id',
      label: 'Stop 3 ID (optional)',
      description: 'Leave blank to disable',
      type: SETTING_TYPES.STRING,
      value: '',
    },
    stop3_name: {
      id: 'stop3_name',
      label: 'Stop 3 Display Name',
      description: 'Optional third stop name',
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
      DeskThing.send({ type: 'bus', payload: currentStops });
    }
  });

  DeskThing.on('get', (data) => {
    if (data.request === 'bus') {
      DeskThing.send({ type: 'bus', payload: currentStops });
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
