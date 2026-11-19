# @dxos/drawing-app

drawing.sh: the landing page for the agent-diagram DSL, and a diagramming app that is one full-screen canvas. The app
makes an anonymous identity on first run, keeps diagrams in spaces, and shares a space with a link. Spaces, diagrams
and links are Composer's, so a link from either app opens in the other. The spec is `spec/APP.mdl`.

## Source

- `src/main.tsx` and `src/plugins.ts` wire the app: the client and its workers, the boot shell, and the plugin set.
- `src/boot-shell/` is the shell painted before the plugins load: the pill and the canvas frame, and, for an
  invitation link, a still copy of the join dialog over them.
- `src/layout-plugin/` is `DiagramAppPlugin`, the layout plugin in place of Composer's deck. It holds the open space
  and diagram, answers the layout operations other plugins call, and renders everything on screen.
- `src/shared/` is what the boot shell and the layout plugin both use: the pill, the route, local state, default
  names, and the shell state through which the plugin dismisses the shell's parts.
- `landing.html` and `src/landing/` are the landing page, a second page of the same build. Its diagrams
  (`src/landing/diagrams/`) are rendered with `@dxos/drawing` when the page is built.
- `src/functions/` is the Worker: the landing page or the app by host, the share API, and the OTLP proxy.

## Run

```bash
moon run drawing-app:serve
```

The app is at `/`, the landing page at `/landing.html`. The dev server answers the share API from a bucket held in
memory, so the landing page's "Open in app" and `?d=` links work until it restarts.

## Hosts

Each environment's Worker (`drawing-app` in production, `drawing-app-<env>` otherwise) serves both hosts. On a
landing host, `/` is the landing page and every other page address redirects to the app host; `LANDING_HOSTS` and
`APP_ORIGIN` in `wrangler.jsonc` name them.

| Environment | Landing page                | App                    | Shares bucket               |
| ----------- | --------------------------- | ---------------------- | --------------------------- |
| production  | drawing.sh, www.drawing.sh  | app.drawing.sh         | `drawing-sh-shares`         |
| preview     | preview.drawing.sh          | app.preview.drawing.sh | `drawing-sh-shares-preview` |
| dev         | dev.drawing.sh              | app.dev.drawing.sh     | `drawing-sh-shares-dev`     |
| staging     | none                        | its `workers.dev` host | `drawing-sh-shares-staging` |

## Share API

`drawing open` and the landing page's "Open in app" post a diagram's `.dx` source here; `?d=<id>` opens it in the
app as a new diagram.

| Route                 | What                                                                                                                                                  |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST /api/share`     | Body: the `.dx` source as UTF-8 text (max 256 KB, else 413), `?name=` optional. Returns `201 { id, url }`, the link on the app host. 30 requests per minute per IP (429). |
| `GET /api/share/<id>` | The source as `text/plain; charset=utf-8` with `nosniff`, the name in `X-Drawing-Name`; 404 once expired.                                            |

Only source text is stored, never SVG or HTML, so a bucket cannot host active content. Expiry slides: a lifecycle
rule deletes an object 30 days after its last write, and a `GET` more than a day after the last write writes the
object again, which restarts the clock. A new environment's bucket needs:

```bash
pnpm exec wrangler r2 bucket create drawing-sh-shares-<env>
pnpm exec wrangler r2 bucket lifecycle add drawing-sh-shares-<env> expire-30d --expire-days 30 --force
```

Locally, `moon run drawing-app:bundle`, then `pnpm exec wrangler dev` here (local R2 and rate limiter), and
`DRAWING_APP_URL=http://localhost:8787 drawing open arch.dx.svg --print`.

## EDGE

Identities here have no Hub account, so EDGE gives them signaling only: members sync peer to peer while another
member is online. A link from a Composer user whose space has an EDGE agent is redeemed by EDGE at any time. See
the spec's "Running against EDGE without an account" section.
