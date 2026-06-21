export interface GasPrices {
  regular: number | null;
  midgrade: number | null;
  premium: number | null;
  weeklyChange: number | null;
}

interface EiaResponse {
  response?: {
    data?: Array<{ value: string; period: string }>;
  };
}

async function fetchProduct(apiKey: string, product: string): Promise<number[]> {
  try {
    const url =
      `https://api.eia.gov/v2/petroleum/pri/gnd/data/` +
      `?api_key=${encodeURIComponent(apiKey)}` +
      `&frequency=weekly&data[]=value` +
      `&facets[duoarea][]=SNY&facets[product][]=${product}` +
      `&sort[0][column]=period&sort[0][direction]=desc&length=2`;
    const resp = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const json = (await resp.json()) as EiaResponse;
    return (json?.response?.data ?? []).map((r) => parseFloat(r.value));
  } catch (err) {
    console.error(`[gas-prices] Failed to fetch product ${product}:`, err);
    return [];
  }
}

export async function fetchGasPrices(apiKey: string): Promise<GasPrices> {
  if (!apiKey) {
    return { regular: null, midgrade: null, premium: null, weeklyChange: null };
  }

  const [regular, midgrade, premium] = await Promise.all([
    fetchProduct(apiKey, 'EPMR'),
    fetchProduct(apiKey, 'EPMM'),
    fetchProduct(apiKey, 'EPMP'),
  ]);

  const regularCurrent = regular[0] ?? null;
  const regularPrev = regular[1] ?? null;
  const weeklyChange =
    regularCurrent !== null && regularPrev !== null
      ? +(regularCurrent - regularPrev).toFixed(3)
      : null;

  return {
    regular: regularCurrent,
    midgrade: midgrade[0] ?? null,
    premium: premium[0] ?? null,
    weeklyChange,
  };
}
