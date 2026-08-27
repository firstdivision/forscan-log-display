# ForScan Log Display

A web app for visualizing [ForScan](https://forscan.org/home.html) CSV diagnostic logs. Built with Vite, React, TypeScript, and [Apache ECharts](https://echarts.apache.org/en/index.html).

Live app: https://firstdivision.github.io/forscan-log-display/

## Features

- Load bundled sample CSV logs, or drag-and-drop / upload your own ForScan CSV export.
- Charts are generated dynamically from whatever numeric columns are present in the CSV — no hardcoded schema.
- Choose which fields to display, and switch between a **Stacked** layout (one chart per field, with synchronized zoom) and a **Combined** layout that draws every selected field on a single full-viewport chart with a legend.
- The combined chart can normalize each field to 0–100% of its own range so signals with very different units (RPM, °C, volts) can be compared side by side; tooltips always report the raw values. A **Raw values** scale option plots everything on one shared axis instead.
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
