# BasicAlpha

BasicAlpha is a Next.js fullstack financial web app for S&P 500 and Nasdaq-100 analysis.

## Features

- Earnings tracker (incoming earnings + expected move)
- Price chart with earnings and macro event overlays (FOMC/CPI/NFP)
- Correlation matrix on daily returns
- Delayed correlation analyzer with configurable positive lags

## Stack

- Next.js App Router + TypeScript + Tailwind CSS
- Route Handlers for server-side APIs
- Finnhub market data (prices, earnings, index constituents)
- ECharts for line/heatmap visualizations

## Setup

1. Install dependencies:

```bash
npm install
```

2. Configure environment:

```bash
cp .env.example .env.local
```

Set `FINNHUB_API_KEY` in `.env.local`.

3. Start dev server:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Scripts

- `npm run dev` - start development server
- `npm run build` - production build
- `npm run start` - run production server
- `npm run lint` - lint checks
- `npm run test` - unit tests
- `npm run test:e2e` - Playwright smoke tests

## API Endpoints

- `GET /api/universe?index=sp500|nasdaq100|both`
- `GET /api/earnings?from=YYYY-MM-DD&to=YYYY-MM-DD&index=...`
- `GET /api/prices?symbol=TSLA&from=YYYY-MM-DD&to=YYYY-MM-DD`
- `GET /api/events?from=YYYY-MM-DD&to=YYYY-MM-DD`
- `POST /api/correlation`
- `POST /api/correlation/lagged`
