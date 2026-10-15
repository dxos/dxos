# Operations: standing facts for agents

Read this first in every session. It records what is true about the project's accounts, services and
working rules, so a session whose context was summarized or restarted does not have to rediscover them.
Update it when a fact changes. Never write a credential's value here, only where to read it.

## Standing instructions (Dmytro)

1. Work autonomously. Do not block on the user; when out of tasks, find work that keeps the spirit.
2. Log every user message verbatim in [USER.md](./USER.md). Record each decision in
   [DECISIONS.md](./DECISIONS.md) and each stage in [TIMELINE.md](./TIMELINE.md).
3. Track tasks in the codebase (`deus task …`) and keep them current. Most development happens through the
   codebase; specs are recorded in the codebase, not in git.
4. All sessions merge their changes into PR #13952 (branch `dm/agent-13-oct-x8ehi8-0y35ai`). Close extra PRs.
   Keep #13952 a draft.
5. Flows that prevent data loss are core (D188).
6. Deploying to the DEUS Cloudflare account (the one the Worker runs on) is allowed.

## Credentials

| What                                      | Where                                                                  | Reaches                                                                                                                                |
| ----------------------------------------- | ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| DEUS Cloudflare account API token         | `op read 'op://CI/DEUS token/credential'` (`OP_SERVICE_ACCOUNT_TOKEN`) | account `ba80533b56e4658ce26b198a040692a9` ("Dmytro@braneframe.com's Account"): the `deus` Worker, R2 `deus-codebases`, D1 `deus-auth` |
| `CLOUDFLARE_API_TOKEN` (environment)      | already exported                                                       | the DXOS account `950816f3f59b079880a1ae33fb0ec320` only, not the Worker's                                                             |
| `DEUS_API_KEY` (environment)              | already exported                                                       | the Worker's `/v1` API as a push key; it lacks the `admin` scope (`/v1/keys` answers 403)                                              |
| `R2_ACCESS_KEY_ID`/`R2_SECRET_ACCESS_KEY` | already exported                                                       | the DXOS account's `agent-artifacts` bucket (endpoint `https://950816f3f59b079880a1ae33fb0ec320.r2.cloudflarestorage.com`)             |

Use the DEUS token for one command at a time, so it never lands in a file or the transcript:

```bash
cd packages/reflect/deus-lang/platform/worker
CLOUDFLARE_API_TOKEN="$(op read 'op://CI/DEUS token/credential')" npx -y wrangler@4 deploy
```

Checked 2026-10-15 18:10 UTC: `wrangler whoami`, `deployments list`, `r2 bucket list` and `d1 list` all work
with it.

## Services

- **Worker `deus`**: https://deus.dmytro-a80.workers.dev. Source `platform/worker/` (`wrangler.toml`, `worker.mjs`,
  `remote.mjs`). Bindings: R2 `BUCKET` = `deus-codebases`, D1 `DB` = `deus-auth`; vars `PREFIX = "toolchain"`,
  `GITHUB_ORG = "dxos"`.
- **Replication API** `/v1/@owner/project/…` (D185); `/v1/toolchain` is an alias of `@dxos/toolchain`.
  `GET /v1` lists the scopes (`push`, `compact`, `assets`, `inbox`, `site`, `events`, `admin`).
  Areas: `bundles`, `packs`, `objects`, `meta`, `names/<branch>/<Name>`, `headlog`, `files/<folder>`.
  Writes need `Authorization: Bearer deus_<id>_<secret>`.
- **Explorer**: `/@owner/project/` serves it; `/@dxos/toolchain/Cli.dispatch` opens that definition (D184).
- **Toolchain codebase remote**: `deus remote add origin https://deus.dmytro-a80.workers.dev/v1/toolchain`.

## Working copy

`~/.deus` is the toolchain codebase pulled from `origin` (the Worker): `deus init --empty`,
`deus project init https://dxos.org/deus/toolchain`, `deus remote add origin …/v1/toolchain`, `deus pull origin`,
`deus merge origin.main` (30 s). A push takes about a minute, most of it refreshing the explorer.
`~/.deus-2026-10-14` is this container's older local codebase, kept, not deleted.

## Keys and D1

- Keys live in D1 `deus-auth`, table `api_keys`; `scripts/deus-keys.mjs list|new|grant|revoke` edits them with the
  DEUS account token (run it with `CLOUDFLARE_API_TOKEN="$(op read 'op://CI/DEUS token/credential')"`).
- The env key `DEUS_API_KEY` is id `fac9c0ca01b40e2e`, labelled "dmytro (env secret)": scopes push, assets, site,
  inbox, events; projects `toolchain` and `@dxos/*` (granted 2026-10-15, task b6503c12).
- The account is on Workers Paid since 2026-10-15 18:15 UTC. Before that, D1's free 100,000 row writes a day ran out
  (52k site-file audit rows between 08:00 and 12:00, before D181 stopped them) and key changes failed with code 7500.
  Moving the audit log off the key database is task e9d9a541 (low).

## Deploying the Worker

```bash
cd packages/reflect/deus-lang/platform/worker
CLOUDFLARE_API_TOKEN="$(op read 'op://CI/DEUS token/credential')" CI=1 /home/user/dxos/node_modules/.bin/wrangler deploy
```

Run `src/worker-remote.test.ts` first. Deploy only committed code, so git says what is live. Last deploy:
2026-10-15 18:16 UTC, version 8a76fec2 (path links for names ending like a file).

## Budget guard (D190)

- The account's $10 budget alert (policy `f9d757935eb1427bb38f503d1a1df1b4`) emails Dmytro and calls the webhook
  destination `deus-guard` (`41eda9b9798f475289dc604b1534c7b6`) → https://deus-guard.dmytro-a80.workers.dev/alert.
- The guard (`platform/guard/`) then turns off the workers.dev route and cron triggers of every other Worker. Its
  `CF_TOKEN` secret is the account token "deus-guard (budget cut)" (`d321bf6e…`, Workers Scripts Read and Write).
- Recover a cut Worker by deploying it again (`wrangler deploy` in its folder).
- The webhook secret is only in the guard's secrets, the destination, and this container's
  `/home/user/dxos/.secrets/deus-guard.env` (1Password `CI` is read-only for the service account). To rotate it:
  generate a value, `wrangler secret put WEBHOOK_SECRET` in `platform/guard/`, then update the destination's secret
  (`PUT /accounts/<id>/alerting/v3/destinations/webhooks/41eda9b9…`).
- Drill: `curl -X POST -H "cf-webhook-auth: $WEBHOOK_SECRET" "https://deus-guard.dmytro-a80.workers.dev/drill?script=<a canary>"`;
  `GET /status` with the same header lists every Worker and whether its route is on. Never drill `deus`.

## Open state (2026-10-15)

- The meta-structure thread stopped at 18:00. Its handoff says the next step is publishing `@dxos/base` and
  `@dxos/examples`, blocked on the API key lacking those projects (403 "this API key cannot write to
  @dxos/base"). The plan is D189.
- Its handoff names git commit `dcc624f0`, which is not on `origin/dm/agent-13-oct-x8ehi8-0y35ai` (head
  `cd8ee7ce`, 13:32 UTC). Find where it went before relying on it.
- The coordinator session is archived. It was waiting on: where the explorer is published on R2, a go-ahead
  for Basin analytics, and R2 keys or network access for the explorer and analytics environments.
