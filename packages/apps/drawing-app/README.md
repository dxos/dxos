# @dxos/drawing-app

drawing.sh: the site for the agent-diagram DSL (a home page and docs), and a diagramming app that is one full-screen canvas. The app
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
- `site/` and `astro.config.ts` are the site, an Astro Starlight site: the home page (`site/content/docs/index.mdx`,
  Starlight's splash template) and the docs (`site/content/docs/docs/`).
- `src/landing/` is the home page's editor and scripts. Its diagrams (`src/landing/diagrams/`) are rendered with
  `@dxos/drawing` when the site is built.
- `src/functions/` is the Worker: the site or the app by host, the share API, and the OTLP proxy.

## Run

```bash
moon run drawing-app:serve
```

```bash
moon run drawing-app:serve-site
```

`serve` is the app at http://localhost:5173. It also answers the share API from a bucket held in memory, so `?d=`
links work until it restarts. `serve-site` is the site at http://localhost:4321; its "Open app" links and the
editor's "Open in app" go to the app's dev server.

`moon run drawing-app:bundle` builds the app into `out/drawing-app` and the site into `out/drawing-app/site`.

## Hosts

Each environment's Worker (`drawing-app` in production, `drawing-app-<env>` otherwise) serves both hosts. On a
landing host, `/`, `/docs/` and the site's files come from `out/drawing-app/site`, and every other page address
redirects to the app host; `LANDING_HOSTS` and
`APP_ORIGIN` in `wrangler.jsonc` name them.

For now the production hosts point at preview and production has no custom domain. Preview binds production's
bucket while it serves them, so existing `?d=` links keep opening.

| Environment | Site                        | App                    | Shares bucket               |
| ----------- | --------------------------- | ---------------------- | --------------------------- |
| production  | none                        | its `workers.dev` host | `drawing-sh-shares`         |
| preview     | drawing.sh, www.drawing.sh  | app.drawing.sh         | `drawing-sh-shares`         |
| dev         | dev.drawing.sh              | app.dev.drawing.sh     | `drawing-sh-shares-dev`     |
| staging     | none                        | its `workers.dev` host | `drawing-sh-shares-staging` |

## Share API

`drawing open` and the home page's "Open in app" post a diagram's `.dx` source here; `?d=<id>` opens it in the
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
