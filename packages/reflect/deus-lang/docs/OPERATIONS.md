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
   Keep #13952 a draft. When it merges, the explorer's repo links move to `main` (task ccf9b182).
5. Flows that prevent data loss are core (D188).
6. Deploying to the DEUS Cloudflare account (the one the Worker runs on) is allowed.

## Safeguards against stopping (Dmytro, 2026-10-16)

An agent here must never end a turn with work left. Three independent mechanisms:

1. **Autonomous run**: `bash .claude/scripts/autonomous.sh set '<task>'` then `dod set '<checklist>'`. The Stop hook
   (`.claude/hooks/autonomous-stop.sh`) blocks ending a turn up to three times per user turn while the run is on.
   End it only with `autonomous.sh stop 'done: …'` after the definition of done is met, then start the next run.
2. **30-minute reminder**: a `CronCreate` job (`13,43 * * * *`) re-reads this file and the user log. It lives only in
   the session; recreate it after a restart (`CronList` shows none).
3. **Hourly watchdog**: the server-side scheduled task "DEUS keep-working watchdog" (`trig_015N9KHteiPmwmnVtESon6Jw`)
   fires into this session every hour even after a restart, and restarts 1 and 2 when they are gone.

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
- **KV `deus-cache`** (`084c8df5e4bd4e8ab9b79e25b6d240fc`, binding `CACHE`): shown heads (`head:<project>:<branch>`, 60 s)
  and drawn explorer pages (their bucket key, 7 days), read through (D197).
- **Queue `deus-live`**: a pack index upload sends `{ project }`; the Worker's `queue` handler draws that project's
  head explorer (D192).
- **Hub** (D200): `/` lists every project with global counts and a search; `GET /v1/_projects` is its data.
- **Explorer**: `/@owner/project/` serves it (D196: overview by area, spec documents as `#s:<Doc>` pages); `/@dxos/toolchain/Cli.dispatch` opens that definition (D184).
- **Toolchain codebase remote**: `deus remote add origin https://deus.dmytro-a80.workers.dev/v1/toolchain`.

## Working copy

`~/.deus` is the toolchain codebase pulled from `origin` (the Worker): `deus init --empty`,
`deus project init https://dxos.org/deus/toolchain`, `deus remote add origin …/v1/toolchain`, `deus pull origin`,
`deus merge origin.main` (30 s). A push takes about 10 s; the Worker draws the explorer afterwards (D192).
`~/.deus-2026-10-14` is this container's older local codebase, kept, not deleted.

## Running tests fast (D281)

- The vitest suite runs the native CLI of the current seed when one is cached (`~/.cache/deus/native/<seed hash>`),
  as `bin/deus.mjs` does: the whole suite takes about 60 s instead of about 180 s. Any `bin/deus.mjs` command starts the
  build after a seed change; an unoptimized CLI is ready in about a minute and the `-O2` one replaces it about two
  minutes later. Until then tests run the seed on node, as CI always does.
- `DEUS_TEST_KERNEL=node` forces the seed on node, which is what CI tests. A test that checks a back end against the
  reference kernel uses the harness's `deusNode` (the native interpreter's `show` differs on data, task 7f42cca0).
- Run one file with `npx vitest run src/<file>.test.ts`; long runs go in the background.
- `deus test` and `deus check` print `slowest:` on stderr when a check took over a second, and `--json` gives each
  check's `ms` (D285). `deus build --c` keeps compiled programs in `~/.cache/deus/cc` by the hash of their C (D282).

## Writing pure tests (D283, D286)

- A test runs in the simulator (`Sim.run`): an in-memory file system, a counting clock, a seeded `Random`, and the
  file tools the CLI shells out to (`cp`, `mv`, `rm`, `install`, `gzip`); anything else exits 127. Its verdict is
  kept by hash, so it costs nothing until what it reaches changes.
- Run real commands against simulated stores: `Codebase.Spec.inStore` (one store) or `Replicate.Spec.twoStores`
  (two), `Replicate.Spec.cli dir [args] (fun x => Cli.push x)`, `Replicate.Spec.sharedRemote a b` (a directory
  remote both use), `Replicate.Spec.commitSource dir "def …"` and `DataSafety.Spec.refusedWith` for a refusal.
- A command that ends in `IO.exit` (a failing `deus test`) cannot run in a simulation; check one level down
  (`Check.checkTest`, `Check.remember`).
- `@[expectFail]` marks a test or theorem meant to fail; it passes while it fails (D280).
- Tests that only belong to the codebase (spec tests) are added with `deus add <file>` from a scratch file; spec
  documents are changed by `deus view X.Spec > f.mdl`, editing, and `deus update f.mdl`.
- A definition of a mounted library (`lib.base.*`, such as `Sim`) is changed in that library's own codebase
  (`~/.deus-base`: pull, update, push), then `deus lib install base ~/.deus-base` in `~/.deus`; `deus update` refuses
  it in the toolchain (D284).

## Usability probe

`node scripts/visit.mjs <url> [--click <text>]… [--shot f.png] [--scroll <css>]` shows a page as text. A Haiku
agent given only that and the URL is the usability probe (Dmytro's idea); reports go to `docs/ux/`.

## Container setup

- Run `scripts/setup.sh` after pulling kernel changes: `explore --console` (in `src/cli.test.ts`) runs the wasm kernel
  built under `deus-kernel/target/`, and a stale build fails with `no handler for #IO op 8` because the host only
  answers `urn:deus:builtin:IO` (D68).

## Keys and D1

- Keys live in D1 `deus-auth`, table `api_keys`; `scripts/deus-keys.mjs list|new|grant|revoke` edits them with the
  DEUS account token (run it with `CLOUDFLARE_API_TOKEN="$(op read 'op://CI/DEUS token/credential')"`).
- The env key `DEUS_API_KEY` is id `fac9c0ca01b40e2e`, labelled "dmytro (env secret)": scopes push, assets, site,
  inbox, events; projects `toolchain` and `@dxos/*` (granted 2026-10-15, task b6503c12).
- The account is on Workers Paid since 2026-10-15 18:15 UTC. Before that, D1's free 100,000 row writes a day ran out
  (52k site-file audit rows between 08:00 and 12:00, before D181 stopped them) and key changes failed with code 7500.
  Since D217 the audit log is objects under `_audit/` in the bucket, so it no longer writes to D1.

## Deploying the Worker

```bash
cd packages/reflect/deus-lang/platform/worker
CLOUDFLARE_API_TOKEN="$(op read 'op://CI/DEUS token/credential')" CI=1 /home/user/dxos/node_modules/.bin/wrangler deploy
```

Before deploying: `node scripts/build-worker.mjs --live` (the explorer app and its DEUS code compiled to JS from
`~/.deus`, into `platform/worker/gen/`), then `src/worker-remote.test.ts` and `src/live-explorer.test.ts`. Deploy only
committed code, so git says what is live.

The explorer is drawn live (D192): `/v1/<project>/live/<branch>` names the head, and `/live/<causal>/index.json`,
`def/<hash>.json` and `change/<causal>.json` are its pages, kept in the bucket under `<project>/live/`. `deus test LiveSite --integration` checks the deployed site (D193; `DEUS_SITE` for another deployment) — run it
after every deploy. `wrangler tail
deus` shows a `live … pass N: K missing` line for every pass that read something not prefetched. Last deploy:
2026-10-18 UTC, version 507867a8 (D277: documents named Docs.*Md, embed changes name their file; D276: attachment rules in DEUS, review fixes; D274: all checks pass on the overview, the finder opens documents, CommonMark code spans; D272: every document in the codebase, read as cards; D271: site routing in DEUS; D270: Checked by, the explorer browser test; D269: phone hash and dialect, paged lists; D268: definition-card audit fixes; D267: explorer writes checked in DEUS; D266: inbox requests by Sexp in DEUS; D265: the guide as a card; D264: review fixes; D263: results cached a minute; D262: the tree is one Tab stop; D261: decisions in the codebase, opened as cards; D260: task board filters, History counts on a phone; D259: fresh pages drawn first after a push; D258: the printer breaks long lines; D257: third explorer audit fixes; D256: the packs API in DEUS; D255: the objects, meta, names and head log APIs; D254: the keys API; D253: the bundles API; D252: the files API).
`scripts/build-worker.mjs --live` also builds the demo, `gen/address.js`, and `gen/packs.js`, `gen/heads.js`, `gen/keys.js`, `gen/names.js`, `gen/paths.js`, `gen/routes.js` and `gen/files.js` from the
`@dxos/worker` codebase (`DEUS_WORKER_CODEBASE`, default `~/.deus-worker`). Run it after changing `examples/react`,
`platform/js`, `deus/address.deus` or `platform/worker/deus/`, with `DEUS_CODEBASE` the toolchain codebase.

A `deus push origin` takes about 10 s; the `deus-live` queue then draws the index in about a minute and every page in
about 6. Until the index is drawn, visitors see the head drawn last (D195; `live/shown/<branch>`, `live/drawn.json`).

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

## Open state (2026-10-17 02:30 UTC)

- Projects on the Worker: `@dxos/base`, `@dxos/toolchain` (mounts base), `@dxos/examples` (mounts base), `@dxos/web` (mounts base
  and toolchain; D206, D211) and `@dxos/worker` (mounts toolchain and web; D230), the Worker's own DEUS code from
  `platform/worker/deus/`, which `scripts/build-worker.mjs --live` compiles from `~/.deus-worker` (pull it there first). The toolchain is developed in `~/.deus`. To change a library: pull it into a scratch codebase, change it,
  push it, then `deus lib install <name> <that codebase or its https://<host>/v1/@owner/project URL>` in each project that mounts it; the upgrade propagates to dependents.
  `sync-deus.py` writes `lib.base.X` into deus/ as `X`. Web's code is `platform/js/` and `examples/` in git; update it into a pull of
  `@dxos/web`, not into the toolchain.
- Edit the toolchain codebase-first: `deus update deus/<file>.deus` into `~/.deus`, then `scripts/sync-deus.py`, which
  refuses to overwrite `deus/` edits the codebase lacks (D215). A change to `deus/cgen.deus`'s C runtime reaches
  the native CLI only from the seed after it, since a build emits the runtime of the compiler running it.
- Waiting on Dmytro: Basin (task c5955f97, creating Cloudflare resources), the inbox Worker secrets (729ad2b4),
  and whether CI's Check workflow installs pyarrow, DuckDB and pyiceberg for `src/analytics-readers.test.ts`
  (1ad89782). Without that Python, the test skips; `DEUS_PYTHON` names an interpreter that has them.
- Its handoff names git commit `dcc624f0`, which is not on `origin/dm/agent-13-oct-x8ehi8-0y35ai` (head
  `cd8ee7ce`, 13:32 UTC). Find where it went before relying on it.
- The coordinator session is archived. It was waiting on: where the explorer is published on R2, a go-ahead
  for Basin analytics, and R2 keys or network access for the explorer and analytics environments.
