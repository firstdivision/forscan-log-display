# ForScan Log Display

A web app for visualizing [ForScan](https://forscan.org/home.html) CSV diagnostic logs. Built with Vite, React, TypeScript, and [Apache ECharts](https://echarts.apache.org/en/index.html).

Live app: https://firstdivision.github.io/forscan-log-display/

## Features

- Load bundled sample CSV logs, or drag-and-drop / upload your own ForScan CSV export.
- Charts are generated dynamically from whatever numeric columns are present in the CSV — no hardcoded schema.
- If a `MISFIRE` column is present, toggle a shaded overlay on the charts showing when misfires occurred.

## Development

```bash
npm install
npm run dev      # start local dev server
npm run build    # production build to dist/
npm run preview  # preview the production build
```

## Deployment

Pushing to `main` triggers a GitHub Actions workflow ([.github/workflows/deploy.yml](.github/workflows/deploy.yml)) that builds the app and deploys it to GitHub Pages.
