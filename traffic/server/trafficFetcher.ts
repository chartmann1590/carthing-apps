export interface RouteConfig {
  name: string;
  from: string;
  to: string;
}

export interface Route {
  name: string;
  travelTimeMin: number;
  noTrafficMin: number;
  delayMin: number;
  status: 'normal' | 'slow' | 'heavy';
}

interface TomTomResponse {
  routes?: Array<{
    summary?: {
      travelTimeInSeconds?: number;
      noTrafficTravelTimeInSeconds?: number;
      trafficDelayInSeconds?: number;
    };
  }>;
}

export async function fetchRouteTraffic(apiKey: string, config: RouteConfig): Promise<Route | null> {
  if (!apiKey || !config.from || !config.to) return null;

  try {
    const url =
      `https://api.tomtom.com/routing/1/calculateRoute/` +
      `${encodeURIComponent(config.from)}:${encodeURIComponent(config.to)}/json` +
      `?key=${apiKey}&traffic=true&travelMode=car&computeTravelTimeFor=all`;

    const resp = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!resp.ok) {
      console.error(`[traffic] TomTom returned ${resp.status}`);
      return null;
    }

    const json = (await resp.json()) as TomTomResponse;
    const summary = json?.routes?.[0]?.summary;
    if (!summary) return null;

    const travelSec = summary.travelTimeInSeconds ?? 0;
    const noTrafficSec = summary.noTrafficTravelTimeInSeconds ?? travelSec;
    const delaySec = summary.trafficDelayInSeconds ?? Math.max(0, travelSec - noTrafficSec);

    const travelMin = Math.round(travelSec / 60);
    const noTrafficMin = Math.round(noTrafficSec / 60);
    const delayMin = Math.round(delaySec / 60);

    let status: 'normal' | 'slow' | 'heavy' = 'normal';
    if (delayMin >= 10) status = 'heavy';
    else if (delayMin >= 4) status = 'slow';

    return { name: config.name, travelTimeMin: travelMin, noTrafficMin, delayMin, status };
  } catch (err) {
    console.error(`[traffic] Error fetching route "${config.name}":`, err);
    return null;
  }
}

export async function fetchAllRoutes(apiKey: string, configs: RouteConfig[]): Promise<Route[]> {
  const results = await Promise.all(configs.map((c) => fetchRouteTraffic(apiKey, c)));
  return results.filter((r): r is Route => r !== null);
}
