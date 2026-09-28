# Shopbook frontend

Next.js App Router, React and TypeScript. See the root README for complete setup, accounting rules and backend requirements.

```powershell
npm ci
npm run dev -- --hostname 127.0.0.1 --port 3001
```

Open http://127.0.0.1:3001. API requests use the same-origin /api proxy to BACKEND_URL (default http://127.0.0.1:8000).

Checks: npm run type-check, npm run lint, npm run build.

Visual system: white 240px sidebar, cool gray background, navy text and forest-green actions. The dashboard uses actual API values; generated concept examples and percentage changes are not fabricated in the application.
