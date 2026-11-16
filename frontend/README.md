# Aasha Setu — frontend

Next.js 16 PWA: the citizen app and the command dashboard. Built as a static
export (`out/`) and hosted on Cloudflare Pages.

```bash
npm install
npm run dev     # http://localhost:3000 — set NEXT_PUBLIC_API_URL (default http://localhost:8000/api/v1)
npm run build   # static export + type-check
npx eslint src
```

Project overview, architecture and backend setup: [main README](../README.md).
Deployment: [DEPLOY.md](../DEPLOY.md).
