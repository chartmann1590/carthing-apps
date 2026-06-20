export interface BusArrival {
  line: string;
  destination: string;
  minutes: number | null;
  scheduled: boolean;
}

export interface StopArrival {
  stopName: string;
  arrivals: BusArrival[];
}

function minutesUntil(isoTime: string | undefined): number | null {
  if (!isoTime) return null;
  const diff = new Date(isoTime).getTime() - Date.now();
  if (isNaN(diff)) return null;
  return Math.max(0, Math.round(diff / 60000));
}

interface SiriVisit {
  MonitoredVehicleJourney?: {
    PublishedLineName?: unknown;
    DestinationName?: unknown;
    MonitoredCall?: {
      ExpectedArrivalTime?: string;
      AimedArrivalTime?: string;
    };
  };
}

export async function fetchStopArrivals(
  apiKey: string,
  stopId: string,
  stopName: string,
): Promise<StopArrival> {
  const label = stopName || stopId;
  if (!apiKey || !stopId) return { stopName: label, arrivals: [] };

  try {
    const url =
      `https://api.511.org/transit/StopMonitoring` +
      `?api_key=${encodeURIComponent(apiKey)}` +
      `&agency=CDTA` +
      `&MonitoringRef=${encodeURIComponent(stopId)}` +
      `&format=json`;

    const resp = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

    let text = await resp.text();
    // 511NY sometimes prepends a BOM
    if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);

    const json = JSON.parse(text);
    const visits: SiriVisit[] =
      json?.Siri?.ServiceDelivery?.StopMonitoringDelivery?.[0]?.MonitoredStopVisit ?? [];

    const arrivals: BusArrival[] = visits.map((visit) => {
      const journey = visit.MonitoredVehicleJourney;
      const call = journey?.MonitoredCall;
      const expected = call?.ExpectedArrivalTime;
      const aimed = call?.AimedArrivalTime;

      return {
        line: journey?.PublishedLineName?.toString() ?? '?',
        destination: journey?.DestinationName?.toString() ?? '',
        minutes: minutesUntil(expected ?? aimed),
        scheduled: !expected,
      };
    });

    arrivals.sort((a, b) => (a.minutes ?? 999) - (b.minutes ?? 999));
    return { stopName: label, arrivals: arrivals.slice(0, 5) };
  } catch (err) {
    console.error(`[bus] Error fetching stop ${stopId}:`, err);
    return { stopName: label, arrivals: [] };
  }
}

export async function fetchAllStops(
  apiKey: string,
  stops: Array<{ id: string; name: string }>,
): Promise<StopArrival[]> {
  const configured = stops.filter((s) => s.id);
  if (configured.length === 0) return [];
  return Promise.all(configured.map((s) => fetchStopArrivals(apiKey, s.id, s.name)));
}
