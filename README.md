# CarThing Apps

A collection of [DeskThing](https://github.com/ItsRiprod/DeskThing) apps for the Spotify CarThing, built for daily use in the Capital Region of New York.

## Apps

| App | Description | API Required |
|-----|-------------|--------------|
| [Gas Prices](#gas-prices) | NY State weekly gas prices (regular, midgrade, premium) | EIA |
| [Calendar](#calendar) | Today's events from Google Calendar | None (ICS URL) |
| [CDTA Bus](#cdta-bus) | Real-time bus arrivals for up to 3 stops | 511NY |
| [Traffic](#traffic) | Live commute times for up to 2 routes | TomTom |
| [Schenectady News](#schenectady-news) | Local news headlines | None |

---

## Gas Prices

Pulls weekly retail gas prices for New York State from the [EIA Open Data API](https://www.eia.gov/opendata/) and displays regular, midgrade, and premium prices alongside the week-over-week change.

**Refresh interval:** every 6 hours

**Settings:**

| Setting | Description |
|---------|-------------|
| `EIA API Key` | Free key from [eia.gov/opendata](https://www.eia.gov/opendata/) |

---

## Calendar

Shows today's events pulled from a Google Calendar ICS URL. Works with any calendar that exports a standard `.ics` feed.

**Refresh interval:** every 15 minutes

**Settings:**

| Setting | Description |
|---------|-------------|
| `iCal URL` | Your Google Calendar's secret ICS address (Calendar Settings → Integrate calendar → Secret address in iCal format) |

---

## CDTA Bus

Shows real-time arrival predictions for up to 3 CDTA bus stops using the [511NY API](https://511ny.org/developers).

**Refresh interval:** every 60 seconds

**Settings:**

| Setting | Description |
|---------|-------------|
| `511NY API Key` | Free key from [511ny.org/developers](https://511ny.org/developers) |
| `Stop 1–3 ID` | CDTA stop ID (found on 511NY or the CDTA website) |
| `Stop 1–3 Name` | Display label for the stop |

---

## Traffic

Shows live commute times for up to 2 routes using the [TomTom Routing API](https://developer.tomtom.com/routing-api/documentation/routing/calculate-route).

**Refresh interval:** every 5 minutes

**Settings:**

| Setting | Description |
|---------|-------------|
| `TomTom API Key` | Free key from [developer.tomtom.com](https://developer.tomtom.com) |
| `Route 1–2 Name` | Display label (e.g. "To Work") |
| `Route 1–2 From` | Origin address or `lat,lon` |
| `Route 1–2 To` | Destination address or `lat,lon` |

---

## Schenectady News

Fetches local headlines for Schenectady, NY. No API key required.

**Refresh interval:** every 30 minutes

---

## Installation

Each app is a self-contained DeskThing app. To install one:

1. `cd` into the app directory and run `npm install`
2. Build the package: `npm run build`
3. The zip file will appear in `dist/`. Upload it to DeskThing via the server GUI (**Apps → Upload**).
4. Open the app's settings in DeskThing and enter the required API keys.

```bash
cd gas-prices
npm install
npm run build
# → dist/gas-prices-v1.0.0.zip
```

## Requirements

- [DeskThing Server](https://github.com/ItsRiprod/DeskThing) v0.11.0+
- Node.js 18+
- A Spotify CarThing (or the DeskThing browser client)
