# Cloudflare Pages deployment

This application uses static Next.js output for its UI and Cloudflare Pages Functions for dynamic APIs. Chat and image history remain in the browser's IndexedDB. Chat session links use `/c?session_id=...` so the site can be exported as static files.

## Cloudflare Pages build settings

- Build command: `npm run pages:build` (or `bun run pages:build`)
- Build output directory: `out`
- Root directory: `/`
- Functions source directory: `functions/` (Cloudflare Pages detects it automatically)

The API routes are implemented by `functions/api/chat.ts` and `functions/api/image.ts`. Add secrets/environment variables in the Cloudflare Pages project settings: `CF_ACCOUNT_ID`, `CF_WORKERS_AI_TOKEN`, and optionally `APP_PASSWORD`. Google models additionally need `GOOGLE_API_KEY`, `CF_AI_GATEWAY_NAME`, optional `CF_AI_GATEWAY_TOKEN`, and the build-time variable `NEXT_PUBLIC_CF_AI_GATEWAY_PROVIDERS=google`.

> `NEXT_PUBLIC_*` values are embedded at build time. Set or change them before triggering a deployment.
