# @dxos/drawing-app

app.drawing.sh: a light Composer that is only the Canvas editor. It opens a drawing from `?src=<url>` (a
`.dx.svg` the host serves with CORS), from `?d=<id>` (a share link), by drag-and-drop, or with the Open button.

## Share API

The Worker (`src/worker/main.ts`) serves the share API; everything else is the static bundle (`run_worker_first`
covers only `/api/*`). `drawing open` and the drawing.sh editor's "Open in Composer" button post to it.

| Route                   | What                                                                                     |
| ----------------------- | ---------------------------------------------------------------------------------------- |
| `POST /api/share`       | Body: the `.dx` source as UTF-8 text (max 256 KB, else 413), `?name=` optional. Returns `201 { id, url }`. 30 requests per minute per IP (429). |
| `GET /api/share/<id>`   | The source as `text/plain; charset=utf-8` with `nosniff`, the name in `X-Drawing-Name`; 404 once expired.     |

Only source text is stored, never SVG or HTML, so the bucket cannot host active content. CORS answers
`https://drawing.sh`, `https://www.drawing.sh` and `http://localhost:*` only.

Shares live in the R2 bucket `drawing-sh-shares`, keyed by a 128-bit base64url id. Expiry slides: a lifecycle
rule deletes an object 30 days after its last write, and a `GET` more than a day after the last write writes the
object again (same body, `customMetadata.lastOpened` updated), which restarts the clock. So a link lives until 30
days after it was last opened.

One-time setup (already done for production):

```bash
pnpm exec wrangler r2 bucket create drawing-sh-shares
pnpm exec wrangler r2 bucket lifecycle add drawing-sh-shares expire-30d --expire-days 30 --force
```

## Run and deploy

```bash
moon run drawing-app:bundle
cd packages/apps/drawing-app && pnpm exec wrangler dev   # local R2 and rate limiter
DRAWING_APP_URL=http://localhost:8787 drawing open arch.dx.svg --print

moon run drawing-app:bundle && pnpm exec wrangler deploy -c packages/apps/drawing-app/wrangler.jsonc
```
