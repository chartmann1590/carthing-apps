import * as ical from 'node-ical';

export interface CalEvent {
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  location?: string;
}

export async function fetchCalendarEvents(icalUrl: string): Promise<CalEvent[]> {
  if (!icalUrl) return [];

  try {
    const resp = await fetch(icalUrl, { signal: AbortSignal.timeout(15000) });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const icsText = await resp.text();
    const parsed = ical.sync.parseICS(icsText);

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAhead = new Date(todayStart);
    weekAhead.setDate(weekAhead.getDate() + 7);

    const events: CalEvent[] = [];

    for (const key of Object.keys(parsed)) {
      const component = parsed[key];
      if (component.type !== 'VEVENT') continue;
      const event = component as ical.VEvent;

      let startDate = event.start instanceof Date ? event.start : new Date(event.start as string);
      let endDate = event.end instanceof Date ? event.end : new Date((event.end ?? event.start) as string);

      if (event.rrule) {
        try {
          const duration = endDate.getTime() - startDate.getTime();
          const searchFrom = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          const next = event.rrule.after(searchFrom);
          if (!next) continue;
          startDate = next;
          endDate = new Date(startDate.getTime() + duration);
        } catch {
          continue;
        }
      }

      if (isNaN(startDate.getTime())) continue;
      if (startDate >= weekAhead) continue;
      if (endDate < todayStart) continue;

      const allDay = (event as unknown as { datetype?: string }).datetype === 'date';

      events.push({
        title: event.summary?.toString() ?? 'Untitled',
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        allDay,
        location: event.location?.toString(),
      });
    }

    events.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
    return events.slice(0, 20);
  } catch (err) {
    console.error('[calendar] Error fetching ICS:', err);
    return [];
  }
}
