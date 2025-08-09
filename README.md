# Meta Ads Dashboard (Vite + React + Tailwind)

A shareable, interactive dashboard for Meta Ads CSV exports.

## Features
- CSV **upload** with filename + **upload progress**
- **Column mapping** UI
- **Filters** (date, campaign, ad set, ad)
- KPI cards with **loading overlay** and percent bar
- **Charts** (time series, top entities, CPA/ROAS lines)
- **Raw table** + CSV download
- **Export/Import state** (JSON) for sharing
- Local persistence with `localStorage`

## Quick start
```bash
npm install
npm run dev
```
Open the URL from the terminal (usually http://localhost:5173).

## Build
```bash
npm run build
npm run preview
```

## Notes
- If your CSV headers differ, click **Map columns** after uploading and map each required field accordingly.
- Sample data available via **Load Sample** button.
