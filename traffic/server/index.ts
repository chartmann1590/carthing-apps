import { DeskThing } from '@deskthing/server';
import { AppSettings, DESKTHING_EVENTS, SETTING_TYPES } from '@deskthing/types';
import { fetchAllRoutes, Route, RouteConfig } from './trafficFetcher';

const REFRESH_INTERVAL_MS = 5 * 60 * 1000;

let refreshTimer: ReturnType<typeof setInterval> | null = null;
let currentRoutes: Route[] = [];

async function getConfig(): Promise<{ apiKey: string; routes: RouteConfig[] }> {
  const settings = await DeskThing.getSettings();
  const get = (key: string) => (settings?.[key]?.value as string) ?? '';

  const apiKey = get('tomtom_key');
  const routes: RouteConfig[] = [];

  for (let i = 1; i <= 2; i++) {
    const name = get(`route${i}_name`);
    const from = get(`route${i}_from`);
    const to = get(`route${i}_to`);
    if (name && from && to) routes.push({ name, from, to });
  }

  return { apiKey, routes };
}

async function refresh(): Promise<void> {
  const { apiKey, routes } = await getConfig();
  if (!apiKey || routes.length === 0) {
    console.log('[traffic] No API key or routes configured');
    return;
  }
  console.log(`[traffic] Fetching ${routes.length} route(s)...`);
  currentRoutes = await fetchAllRoutes(apiKey, routes);
  DeskThing.send({ type: 'traffic', payload: currentRoutes });
}

const start = async () => {
  const settings: AppSettings = {
    tomtom_key: {
      id: 'tomtom_key',
      label: 'TomTom API Key',
      description: 'Free key from developer.tomtom.com — 2500 requests/day on free tier.',
      type: SETTING_TYPES.STRING,
      value: '',
    },
    route1_name: {
      id: 'route1_name',
      label: 'Route 1 Name',
      description: 'e.g. "Home to Work"',
      type: SETTING_TYPES.STRING,
      value: '',
    },
    route1_from: {
      id: 'route1_from',
      label: 'Route 1 Origin (lat,lon)',
      description: 'e.g. "42.8152,-73.9394" — use Google Maps to find coordinates',
      type: SETTING_TYPES.STRING,
      value: '',
    },
    route1_to: {
      id: 'route1_to',
      label: 'Route 1 Destination (lat,lon)',
      description: 'e.g. "42.7284,-73.6918"',
      type: SETTING_TYPES.STRING,
      value: '',
    },
    route2_name: {
      id: 'route2_name',
      label: 'Route 2 Name (optional)',
      description: 'Leave blank to disable second route',
      type: SETTING_TYPES.STRING,
      value: '',
    },
    route2_from: {
      id: 'route2_from',
      label: 'Route 2 Origin (lat,lon)',
      description: 'Optional second route starting point',
      type: SETTING_TYPES.STRING,
      value: '',
    },
    route2_to: {
      id: 'route2_to',
      label: 'Route 2 Destination (lat,lon)',
      description: 'Optional second route endpoint',
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
      if (currentRoutes.length > 0) DeskThing.send({ type: 'traffic', payload: currentRoutes });
    }
  });

  DeskThing.on('get', (data) => {
    if (data.request === 'traffic') {
      DeskThing.send({ type: 'traffic', payload: currentRoutes });
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
