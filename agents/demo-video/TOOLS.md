# Tool and console registry

Every external service this project touches: where its settings live, which credential it
issues, and where that credential lands. Keep this current — a dead console link costs
twenty minutes on a shoot day.

**Verified** column: `given` = supplied by Rich · `checked` = confirmed this session ·
`repo` = read out of this repo or `edge` · `unverified` = from general knowledge, confirm on
first use.

## Production tools

| Tool | Settings / API page | Credential | Lands in | Verified |
| --- | --- | --- | --- | --- |
| **HeyGen** — avatar + voice renders | https://app.heygen.com/developers/api | API key | `HEYGEN_API_KEY` · `op://Employee/pewtgrrxyrrpldhwafmb25gpuu/credential` | `given` |
| **Ideogram** — generated stills | https://ideogram.ai/manage-api | API key | `IDEOGRAM_API_KEY` · `op://Employee/yionmgzrv5aqoox6rypt3fchcm/credential` | `checked` |
| **Screen Studio** — screen capture | app → Settings; account at https://screen.studio/account | licence, no API | — (desktop licence) | `unverified` |
| **Editor** — *undecided* | Descript https://web.descript.com · Kapwing https://www.kapwing.com · Veed https://www.veed.io | account only | — | pending bake-off |

Notes:

- **HeyGen has an archived duplicate item in 1Password**, which `op inject` resolves in
  preference to the live one — hence the item-ID reference. See
  [CREDENTIALS.md](./CREDENTIALS.md).
- Ideogram's API portal also carries **auto top-up** settings (default: top up to $40 when the
  balance drops below $10) and per-request usage. Worth checking before a batch render.
- Ideogram API docs: https://developer.ideogram.ai/ideogram-api/api-setup
- HeyGen is better driven **through Composer** via `plugin-heygen`'s connector than from a
  script — see CREDENTIALS.md. The connector's own form description pointed at the old
  `app.heygen.com/settings` URL; corrected to `/developers/api`.
- HeyGen API: base `https://api.heygen.com/v3`, auth header `X-Api-Key`. Docs:
  https://developers.heygen.com/reference/create-video

## AI keys

| Service | Settings page | Credential | Lands in | Verified |
| --- | --- | --- | --- | --- |
| **Anthropic** | https://console.anthropic.com/settings/keys | API key | `ANTHROPIC_API_KEY`, `DX_ANTHROPIC_API_KEY` · `op://Employee/Anthropic/API_KEY` | `unverified` |
| **OpenAI** | https://platform.openai.com/api-keys | API key | `OPENAI_API_KEY` · `op://Employee/OpenAI/API_KEY` | `unverified` |

The CI vault's `hub.dxos.network` item also holds `ANTHROPIC_API_KEY` and `OPENAI_API_KEY` for
CI use — distinct from the personal Employee-vault keys the root `.env.tpl` resolves.

## Cloudflare and EDGE — needed for the `W` clips

| Surface | URL | Notes | Verified |
| --- | --- | --- | --- |
| **Cloudflare dashboard** | https://dash.cloudflare.com | Workers, DO, R2, D1, Queues — the subject of `W3`/`W6` | `unverified` |
| **API tokens** | https://dash.cloudflare.com/profile/api-tokens | `CLOUDFLARE_API_KEY` / `CLOUDFLARE_API_TOKEN` | `unverified` |
| **R2 API tokens** | Cloudflare dash → R2 → Manage API tokens | issues `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` (S3-compatible) | `unverified` |
| **Hub admin** | https://hub.dxos.network/admin/home | good on camera for `W5` | `repo` |
| **Grafana — log explorer** | https://dxosorg.grafana.net/d/fe3moqvm3woowa/log-explorer | `W5` | `repo` |
| **Grafana — function logs** | https://dxosorg.grafana.net/d/be9dniqv15a80d/log-explorer | worker name in the project selector | `repo` |
| **Grafana — log metrics** | https://dxosorg.grafana.net/d/ae2k4atjvv6yoc/log-metrics | high-level metrics | `repo` |

Deploy for `W4` runs from the sibling `edge` repo: `./scripts/deploy.mjs --env (labs|staging|production)`.
Rehearse against a non-production env before filming.

## App environments — recording targets

| Target | URL | Plugin set | Verified |
| --- | --- | --- | --- |
| **Local dev** | http://localhost:5173 (`moon run composer-app:serve`) | full catalog | `checked` |
| **Preview** — hero shots | https://preview.composer.space | full catalog, EDGE **production** | `repo` |
| ~~**Production**~~ | https://composer.space | `DX_PLUGIN_SET=production` — 7 plugins, no registry, no table/sheet/kanban/explorer/inbox/CRM/map. **Do not film here.** | `repo` |

## Analytics and dev

| Service | URL | Notes | Verified |
| --- | --- | --- | --- |
| **PostHog** | https://posthog.com — prod project `126171`, test `93152`, host `o.composer.space` | the Privacy Notice toast must be dismissed during staging | `repo` |
| **GitHub tokens** | https://github.com/settings/tokens | `GITHUB_TOKEN` · `op://Employee/GitHub/credential` | `unverified` |
| **Linear** | https://linear.app/settings/api | `LINEAR_API_KEY` · `op://CI/dev.dxos.network/LINEAR_API_KEY`; video work relates to DX-1078 | `unverified` |
| **1Password** | vaults `Employee` (personal) and `CI` (shared) | source of every credential above | `checked` |

## Accounts still to create

| Need | For | Owner |
| --- | --- | --- |
| Editor subscription | assembling every cut | Rich, after the bake-off |
| Music licence *(if used)* | hero + investor cuts | open question in TASKS.md |
