# DXOS Repository Guide

Instructions and documentation for developer workflows in this DXOS repository.

## Prerequisites

- Native libraries:

```bash
brew install cairo giflib git-lfs jpeg libpng librsvg pango pkg-config python-setuptools git unzip gzip xz
```

- Install [proto](https://moonrepo.dev/docs/proto/install):

```bash
bash <(curl -fsSL https://moonrepo.dev/install/proto.sh)
```

Setup proto for shell activation:

```bash
eval "$(proto activate zsh --config-mode all)"
```

## Monorepo workspace

This monorepo repository is built with [`pnpm`](https://pnpm.io) and [`moon`](https://moonrepo.dev), with [Changesets](https://github.com/changesets/changesets) for release automation (see [Releasing](#releasing)).

Setup:

```bash
proto install
```

To update moon:

```bash
proto install moon latest
proto pin moon latest
```

Install at the repo root:

```bash
pnpm i
```

Build everything:

```bash
pnpm build
```

> Don't forget to install and build when switching branches

Run all unit tests:

```bash
pnpm test
```

Recompile any package within the monorepo when changes are detected:

```bash
pnpm watch
```

> Run watch alongside a vite dev server to get monorepo-wide hot module reloading

## Run commands

Examples of ways to start up different workloads in dev mode:

| Command                            | Description                                              |
| :--------------------------------- | :------------------------------------------------------- |
| `moon run tasks-app:serve`         | Runs the `tasks-app` in dev mode                         |
| `moon run composer-app:serve`      | Runs the `composer-app` in dev mode                      |
| `moon run composer-app:serve-prod` | Same, with the curated plugin set `composer.space` ships |
| `moon run docs:serve`              | Runs the `docs` astro app in dev mode                    |

Use `--quiet` to suppress progress output (recommended for LLMs to keep context fresh).
Use `--on-failure=continue` to continue running other unrelated tasks even if some fail.

### Plugin sets

Composer builds one of **three plugin sets**, chosen at build time by `DX_PLUGIN_SET`:

| Set            | Selected by                | Plugins                                                   | Registry                         |
| :------------- | :------------------------- | :-------------------------------------------------------- | :------------------------------- |
| full (default) | `DX_PLUGIN_SET` unset      | `src/plugin-defs.tsx` — the whole catalog                 | yes, incl. the dev plugin loader |
| curated        | `DX_PLUGIN_SET=production` | `src/plugin-defs.production.tsx`                          | no                               |
| mobile         | `DX_PLUGIN_SET=mobile`     | `src/plugin-defs.mobile.tsx` — chat and its content types | yes                              |

`vite.config.ts` aliases `./plugin-defs` to the selected file, so **selection is build-time, not a
runtime flag** — a plugin the chosen set doesn't name never enters the module graph (that's the
bundle-size half of it; a runtime toggle would ship everything and merely hide the UI).
`composer-app:check-plugin-set` reads the build's own sourcemaps and fails if a plugin outside the
**production** set leaks in — it only guards that one set, never whichever set a given build actually
chose; **Check** runs it beside `check-boot-budget`.

Consequences worth knowing before you debug something:

- **`composer.space` and every iOS build ship the curated set**; `preview`, `dev` and `staging` ship
  the full one. So the plugin registry, the dev plugin loader and most plugins are simply absent from
  production — not broken.
- **Both talk to Edge prod**, so an object created on preview can be opened in production with no
  plugin that renders it. plugin-preview contributes a last-resort notice for that case rather than
  failing.
- **`serve-prod` is the local equivalent** of a production build, so a plugin missing from the
  curated set surfaces before a deploy rather than after.

Enabled-by-default plugins are a separate axis from bundled ones: `getDefaults` in `plugin-defs.tsx`
turns the dev-only set on for the `dev` environment only. Locally, opt in with `DX_DEV=true` — a
plain `serve` deliberately keeps the lean set so local development isn't weighed down by plugins
you're not looking at.

### Vite's native config loader

`composer-app` loads `vite.config.ts` with `--configLoader native`, so node imports the config
directly (type stripping only) instead of Vite pre-bundling it with Rolldown first. Vite plans to
make this the default. Every `vite` invocation for the app passes the flag — `serve`, `bundle` and
`preview` in `moon.yml`, the Playwright `webServer` commands, and Tauri's `beforeDevCommand` — so
dev and production evaluate the config identically.

A config loaded this way is an ordinary ESM module in node, which constrains it and everything it
imports (here: `vite.base.config.ts`, `vitest.base.config.ts`, `vitest.tags.ts` and
`src/vite/*.ts`):

- relative imports carry their `.ts` extension, and directory-index imports name the index file;
- `import.meta.dirname` / `import.meta.filename` rather than `__dirname` / `__filename`;
- type-only named imports are marked `type`, since nothing erases them for node;
- JSON imports need `with { type: 'json' }`.

Packages still on the default `bundle` loader get these same rules as a warning at config-load
time, listing every offending line — Vite emits it whenever a config would not survive the switch.

Vite also asks for `"type": "module"` on the root `package.json`, which the root-level `.ts`
configs would otherwise miss (node reparses each as ESM after failing to parse it as CommonJS, and
says so). **Do not add it.** Rolldown picks a module's interop mode from the nearest `package.json`
that actually carries a `type` field, not the nearest one that exists — so declaring it at the root
flips every package that does not declare its own, and their `bundle`-loaded configs then read a
default-exported plugin as `{ __esModule, default }` instead of the function
(`PluginImportSource is not a function`). The reparse notice is the cheaper cost.

## Test commands

Examples of ways to run different test workloads:

| Command                         | Description                                                                              |
| :------------------------------ | :--------------------------------------------------------------------------------------- |
| `moon run client-services:test` | Runs the unit tests for `client-services`                                                |
| `moon run echo-db:test-watch`   | Runs the unit tests for `echo-db` whenever any of the source files in the package change |
| `moon run todomvc:e2e`          | Runs the playwright tests for `halo-app`                                                 |
| `moon run todomvc --debug`      | Runs tests with playwright inspector                                                     |

## Storybooks

The following command generates storybooks across the individual packages:

```bash
moon run storybook-react:serve
```

### Fast dev mode (`serve-fast`)

Long React sessions can slow down and eventually wedge the browser tab. By
default Storybook resolves every `@dxos/*` package to source (via the
`importSource` plugin in `tools/storybook-react/.storybook/main.ts`), producing a
huge live module graph that the renderer accumulates until it locks up. For a
lighter session, use the fast variant:

```bash
moon run storybook-react:serve-fast
```

This sets `DX_FASTBUNDLE=1`, which skips `importSource` and pre-bundles heavy
deps (react, effect, codemirror, radix, automerge, atlaskit). One-off use without
the task: `DX_FASTBUNDLE=1 moon run storybook-react:serve`.

**Tradeoff:** `serve-fast` reduces renderer memory and HMR churn, but you get
less granular HMR on DXOS source (edits to `@dxos/*` internals no longer
hot-reload from source). It's best when iterating on a single package's stories,
not when editing deep DXOS internals — use plain `serve` for the latter.

**Known accumulation sources** (present in either mode):

- **WASM stories** (`@dxos/wa-sqlite`, `manifold-3d`) don't free their memory on
  unmount.
- **StrictMode** double-mounts effects, so per-story state accumulates faster.

Either way, hard-reload the tab periodically during long sessions to reclaim
memory.

### Playwright

Playwright tests are written using these [guidelines](./tools/executors/test/PLAYWRIGHT.md).

## Adding new dependencies

All dependency versions are managed in the catalog. To add a new dependency, use the following command:

```bash
pnpm add --filter "<project>" --save-catalog "<package>"
```

See the [pnpm catalog docs](https://pnpm.io/catalogs) for more information.

> TODO: Introduce a separate catalog for peer dependencies.

## Updating dependencies

Use `npm-check-updates` to update dependencies from the root directory. For example:

```bash
npx npm-check-updates -u --deep "@codemirror/*"
pnpm i
```

NOTE: Do not use `pnpm up` since it will update more than the targeted dependencies.

## Resetting stale build state

`pnpm install` reports "Already up to date" in two situations where the workspace is in fact
broken, because neither is tracked by the lockfile:

- A dependency version bump leaves per-package `node_modules/.bin/*` shims pointing at a store
  path pnpm has since removed — the build fails with `MODULE_NOT_FOUND` on a path containing the
  _old_ version.
- Generated sources (e.g. `packages/core/protocols/src/proto/gen`) go stale while moon's cache
  hash still matches, so every run restores the stale output rather than regenerating it.

```bash
pnpm reset          # prune dead .bin shims, reinstall, clear .moon/cache, regenerate protobuf
pnpm reset --deep   # also delete every package dist and reinstall node_modules from scratch
```

Stop any running dev server first — `reset` reinstalls `node_modules` underneath it.

## Folders

| Folder                  | Description                                                                                    |
| :---------------------- | :--------------------------------------------------------------------------------------------- |
| `packages`              | most of the sub packages of the platform                                                       |
| `packages/apps`         | all the applications, samples, app templates, component kits and patterns                      |
| `packages/sdk`          | API surfaces such as the main `@dxos/client` and `@dxos/react-client` packages                 |
| `packages/core`         | main packages that support the `sdk`                                                           |
| `packages/devtools`     | `dx` CLI, `inspector` tool, and other tooling apps                                             |
| `packages/gravity`      | a load and scenario testing framework used to exercise and harden DXOS components              |
| `packages/bots`         | DXOS bots: headless agents which work with ECHO                                                |
| `packages/experimental` | experimental things                                                                            |
| `packages/deprecated`   | deprecated things                                                                              |
| `tools`                 | workflow, automation, tooling code that supports the repo, but isn't part of the main platform |
| `scripts`               | shell scripts for automation                                                                   |
| `patches`               | pnpm applied patches via `pnpm patch`                                                          |
| `docs`                  | a `astro` docs site behind `docs.dxos.org`                                                     |

## Logging

Logging should use the `@dxos/log` package, which can be controlled using using `runtime.client.log` in `@dxos/config`.

For local development, the log filter can be set using the [`LOG_FILTER` environment variable, e.g.](./packages/apps/composer-app/dx-env.yml).

For hosted apps, it can be set in the browser using `localStorage.dxlog`, e.g. `localStorage.dxlog='{ "filter": "messaging:debug,info"}'`.

The filter consists of a series of filename pattern/level tuples separated by commas. For example, `echo:debug,info` will set the log level to `debug` for any filename matching "echo", and `info` for everything else.

## Branches

DXOS is **trunk-based**: `main` is the only long-lived integration branch.

- Work happens on feature branches that merge to `main` via PRs; the **Check** workflow (build, test, lint, fmt) must pass. External contributors fork and PR from their fork.
- Feature branches are **squashed** on merge, keeping `main` linear.
- Consumer-relevant changes carry a `.changeset/*.md` — see the [changeset authoring guide](./agents/instructions/changesets.md). PR titles and commit messages use `scope: description`.
- `dev` / `preview` / `staging` / `production` are **deploy environments**, not long-lived branches — `preview` deploys `main`'s tip daily on a schedule, the rest deploy a chosen commit via the Deploy Apps workflow, and "what's deployed where" is tracked by floating `<app>/<environment>` git tags.

Full design (versioning policy, publish groups, cross-repo contract): [`.github/RELEASE-SPEC.md`](./.github/RELEASE-SPEC.md).

## Releasing

Everything runs in GitHub Actions — nobody runs `changeset` / `pnpm publish` / `git tag` on a laptop. The _why_ is in [`.github/RELEASE-SPEC.md`](./.github/RELEASE-SPEC.md); how to write a changeset is in the [authoring guide](./agents/instructions/changesets.md).

Packages ship as two lockstep groups — **A: Core/SDK** (`@dxos/echo`, `@dxos/client`, …) and **B: Plugins + CLI** (`@dxos/plugin-*`, `@dxos/cli`). Naming one member in a changeset bumps its whole group, and both share one "Version Packages" PR. **Apps are not in a group — they deploy, never publish.**

**npm `@latest`.** Add a `.changeset/*.md` to feature PRs (optional — CI nudges if a publishable change lacks one). Pushes to `main` keep a **"Version Packages" PR** open; **merge it** and `publish-all.yml` publishes the bumped packages to `@latest` (OIDC + provenance) and pushes tags.

**npm `@next`.** A manual dispatch of `publish-all.yml` (Actions → **Publish** → Run workflow) cuts an ephemeral snapshot (`0.9.1-next-<datetime>`) — nothing committed, no tags. Both channels live in `publish-all.yml` because npm's OIDC trusted publisher is bound to that filename; the trigger picks the channel (push → `@latest`, dispatch → `@next`).

**Previews.** Every push to `main` publishes all public packages to [pkg.pr.new](https://pkg.pr.new) (`pkg-pr-new.yml`) — an ephemeral per-commit install channel.

**Deploy apps.** One entry point: the **Deploy Apps** workflow (`deploy-apps.yml`) — pick an environment and the app set follows. Deploys go to Cloudflare Workers Static Assets, decoupled from npm; "what's deployed where" is tracked by floating `<app>/<env>` git tags. Deployable apps are listed in [`.github/workflows/scripts/apps.mjs`](./.github/workflows/scripts/apps.mjs); everything else — Worker name, bundle task, output dir, target environments — derives from each app's `wrangler.jsonc`.

Because these tags are force-moved on every deploy, a plain `git pull`/`git fetch` will reject them once your local clone has a stale copy (`! [rejected] composer/preview -> composer/preview (would clobber existing tag)`). Turn off automatic tag-following once per clone so routine fetches stay quiet:

```bash
git config remote.origin.tagOpt --no-tags
```

You can still pull a specific one on demand: `git fetch origin tag composer/preview --force` (still needs
`--force` — an explicit fetch doesn't skip the clobber check, only the automatic tag-following does), or
check without touching local refs at all: `git ls-remote --tags origin 'composer/*'`.

| Env            | URL                      | EDGE         | Trigger                           | Apps                  | Notes                                                                                       |
| -------------- | ------------------------ | ------------ | --------------------------------- | --------------------- | ------------------------------------------------------------------------------------------- |
| **dev**        | `composer-dev…`          | EDGE preview | manual → `dev`                    | composer              | desktop + iOS → TestFlight; iOS ships the curated plugin set                                |
| **preview**    | `preview.composer.space` | EDGE prod    | auto, 07:00 UTC daily from `main` | all `preview`-enabled | dogfood build; desktop only                                                                 |
| **staging**    | `staging.composer.space` | EDGE prod    | manual → `staging`                | composer + docs       | kept, deliberately unused                                                                   |
| **production** | `composer.space`         | EDGE prod    | manual → `production`             | all                   | cuts a versioned Composer release; **curated plugin set** (see [Plugin sets](#plugin-sets)) |

Local dev talks to EDGE preview by default; point it at EDGE dev or a local EDGE with `DX_EDGE_BASE_URL`.

**`preview` titles the environment above and nothing else.** Per-PR deploys are Cloudflare Worker preview versions of `env.dev` — literally previews, and their internals say so — but they are titled for their trigger, not for that: `pr-build.yml` builds them and `pr-deploy.yml` deploys them to `pr-<n>-composer-dev.dxos.workers.dev`.

Every environment ships a **desktop** Composer on its own CrabNebula channel, so a dogfooder on preview gets the same daily build the web deploy does. Non-production builds are versioned `<base>-<env>.<build>` — one version per run, carried by the web bundle and the native build alike, so About and the updater agree. `<base>` is the _next_ patch, so preview leads the stable it was built from; `<build>` counts that channel's builds of that base version and is claimed by an immutable `composer-<env>-<base>-<build>` git tag (`git ls-remote --tags origin 'refs/tags/composer-preview-*'` lists them), restarting at 0 when a production release bumps the base. Each non-production channel installs as its **own app** — suffixed bundle identifier, its own name and icon (purple for preview, rust otherwise) — so it runs beside the released one with its own data instead of sharing (and migrating) its storage; running a channel means installing that channel's app. **iOS** builds on `dev` alone and goes to TestFlight; the app is not shipped yet, so the other environments have nothing to release to. Once it ships, the intent is preview and staging on their own TestFlight streams and production on the App Store.

**Composer is the only versioned app.** A **production** deploy also cuts its release: the `release` job bumps `composer-app`/`crx` by the dispatch's `bump` input, commits to `main`, tags `composer-v<x>`, then builds + deploys that commit (web + desktop via `deploy-tauri.yaml`, CrabNebula; iOS builds on `dev` alone). This is the only path that advances Composer's version — it is not a Changesets package.

**Triggering a deploy with `gh`.** The `workflow_dispatch` inputs are `environment` (`dev` \| `preview` \| `staging` \| `production`, default `dev`), `app` (`all` default, or one of `composer` / `docs` / `storybook` / `todomvc` / `tasks` / `testbench`), and `bump` (`patch` \| `minor` \| `major`, used only by the production Composer release). `--ref` selects the commit to deploy — it defaults to `main`, and also determines which version of the workflow runs.

```bash
# Composer → dev (the default env). `app` defaults to `all`, which for dev is just composer.
gh workflow run deploy-apps.yml -f environment=dev

# Composer + docs → staging.
gh workflow run deploy-apps.yml -f environment=staging

# Full production deploy AND cut a Composer release with a minor version bump.
gh workflow run deploy-apps.yml -f environment=production -f bump=minor

# Hotfix a single app to production (no Composer release; only that app's pointer tag moves).
gh workflow run deploy-apps.yml -f environment=production -f app=docs

# Deploy a specific tag/commit instead of main's HEAD (e.g. re-deploy a prior Composer release).
gh workflow run deploy-apps.yml --ref composer-v1.4.0 -f environment=production

# Watch the run you just started.
gh run list --workflow=deploy-apps.yml --limit 1
gh run watch
```

Handy as aliases — e.g. `gh alias set deploy-dev 'workflow run deploy-apps.yml -f environment=dev'`, then just `gh deploy-dev`.

**Worker secrets.** `pnpm secrets` (`scripts/secrets.mjs`) populates a Cloudflare Worker's secrets (e.g. composer's `SIGNOZ_INGESTION_KEY`, docs' `DX_POSTHOG_API_KEY`) from a 1Password item, matched by section label — a field under "shared" applies to every target, a field under a section named after the raw Worker name (e.g. `composer-preview`) applies only there. `remote <env>` defaults to `all` — every app (from `.github/workflows/scripts/apps.mjs`) that defines the given env — or name one app to restrict it. The `dev` MODE (`pnpm secrets dev <app>`, which writes `.dev.vars` for local `wrangler dev`) always requires an app; note this is a different `dev` from the `dev` ENVIRONMENT in `pnpm secrets remote dev`, which takes the usual `all` default. Defaults to the "dxos app worker secrets" item (pinned by UUID — stable even if the item is renamed); pass `--item` to target a different one. Requires `CLOUDFLARE_ACCOUNT_ID` in the environment (same variable CI uses):

`secret put` both creates a version and deploys it, so Cloudflare refuses it when a Worker's latest version is not the deployed one. That is the normal state for `composer-dev`, which per-PR deploys upload versions to — promoting the latest there would push whichever PR version happens to be on top. `pnpm secrets` detects that specific refusal and writes the secret with `wrangler versions secret put` instead, which does not deploy; it then says so, because the secret only reaches the running Worker on the next deploy or `versions upload`. Any other failure is reported and exits non-zero as before.

```bash
# Push secrets to every app that has a dev env (currently just composer).
pnpm secrets remote dev

# Push secrets to one specific Worker.
pnpm secrets remote staging docs

# See what would be pushed, for the whole environment, without making any change.
pnpm secrets remote preview --dry-run

# Write .dev.vars for local `wrangler dev` (app is required).
pnpm secrets dev composer

# Target a different 1Password item.
pnpm secrets remote dev --item "some other item"
```

### New npm packages

New packages are created with `"private": true` in their `package.json` (see [New Packages](./AGENTS.md#new-packages)). Publishing a package to npm for the first time requires an initial manual publish, since npm's OIDC trusted publishing (used by [`publish-all.yml`](https://github.com/dxos/dxos/blob/main/.github/workflows/publish-all.yml)) can only be configured for a package that already exists on the registry:

1. Build the package and its dependencies: `moon run <package-name>:build` (this also builds upstream deps via `moon`'s task graph).
2. Set the package's `version` to `0.0.0` and remove `"private": true` from its `package.json` at the same time — a private package cannot be published.
3. Run `pnpm login`, then either:
   - one package: `pnpm publish-package @dxos/<PACKAGE>`
   - all packages failing the published-package gate: `pnpm publish-unpublished-packages --yes`
4. On npmjs.com, go to the package's **Settings → Trusted Publisher** and add GitHub Actions as a trusted publisher:
   - Repository: `dxos/dxos`
   - Workflow file: `publish-all.yml`
   - Environment: leave blank unless the workflow specifies one.
   - Allowed actions: `npm publish` only — do not enable `npm stage publish` (staged/review release flow that `publish-all.yml` does not use).
   - Click "Setup Connection"
5. Revert the package's `version` back to align with the rest of the packages in the monorepo, now that the trusted publisher is configured and `publish-all.yml` will handle future releases.

For bulk setup (roughly **10+ packages** at once), the [npm-trusted-publisher](https://github.com/wittjosiah/npm-trusted-publisher) Chrome extension automates step 4 across many packages. Below that threshold, doing it manually per package is faster.

## Dependencies

Packages can be locked to a particular version as required by updating `pnpm.overrides` in `package.json`.

Examples:

- `"@types/node": "22.5.5"` (required by Cloudflare Workers).

## CI

The build/test pipeline runs on Depot CI. See [`.depot/README.md`](./.depot/README.md), including how to
run a workflow off uncommitted changes without pushing. What is still on GitHub Actions, and why, is in
[`.github/workflows/README.md`](./.github/workflows/README.md).

## Trunk (flaky test quarantining / CI Autopilot)

CI already uploads test results to [Trunk](https://trunk.io), which detects
flaky tests and quarantines (auto-skips) them instead of letting them block
merges. The org-wide Trunk MCP server ("CI Autopilot") is already configured
for this repo — it just needs a one-time per-user authentication:

```bash
claude mcp add --transport http trunk https://mcp.trunk.io/mcp --scope project
```

Then run `claude .`, run `/mcp`, select `trunk`, and hit Enter to authenticate
with your own Trunk account.

For how an agent should use the server's tools (investigating a CI failure,
looking up a flaky test), see the `trunk-quarantine` agent skill
(`.agents/skills/trunk-quarantine/SKILL.md`).

### Manually quarantining a test

Quarantining is a dashboard-only action — there's no CLI or config-file way to
do it, and it's gated by each repo's **Manual Quarantine Permissions** setting
(**Settings → Repositories → [repo] → Flaky Tests**), so admins may need to do
this step.

- **From a test's details page:** click **Quarantine**, choose **Always** in
  the quarantine-status control, add a required comment, then **Save**.
- **From the Flaky Tests table:** open the row's **⋮** actions menu and select
  **Quarantine test**.

To reverse it, use the same controls: **Remove Quarantine** on the details
page, or **Unquarantine test** from the table's actions menu. Every override
is logged in the test's **Events** tab (author, timestamp, comment).

## Patching third-party repos

1. Clone and fork the third-party repo then maked edits and build

```bash
cd ~/Code/Effect-TS
git clone https://github.com/Effect-TS/effect.git
git remote add upstream https://github.com/Effect-TS/effect.git
pnpm build
pnpm ellint
```

2. Create and commit a patch.

```bash
cd ~/Code/dxos/dxos
pnpm patch @effect/ai-anthropic
cp -r ~/Code/Effect-TS/effect/packages/ai/anthropic/dist/* ~/Code/dxos/dxos/node_modules/.pnpm_patches/@effect/ai-anthropic@0.16.1/
pnpm patch-commit
```

This will create a patch file in the `patches` directory and update the `patchDependencies` of the root `package.json`.

3. Submit a PR to the third-party repo.

Create a changeset, command and push.

```bash
pnpm changeset
```

Commit and push the changes to the third-party repo.

## Formatting and linting

Formatting is done by `prettier` and linting by `eslint`. Passing lint is required to merge to `main`.

Run `pnpm lint` to conform the entire repository with (equivalent of `lint --fix`).

Run `pnpm lint:changed` to lint only what you've been working on using `pnpm changed-packages`.

### Unused dependencies and dead code

`pnpm knip` reports unused dependencies, dependencies that are imported without being declared, and
source files nothing references. CI runs the same command in the **Check** workflow's `knip` job, so
a clean local run is a clean CI run. It analyses the source tree directly — resolving workspace
packages through their `source` export condition — so it needs no build and takes about 80 seconds.

Most of what the config in `.config/knip.ts` does is teach knip the ways this repo reaches code
without importing it: lazily via `() => import('./handler')`, by path from a moon task or vite
alias, through a `browser` field substitution, from CSS `@import` and Tailwind `@plugin`, or from a
glslify `#pragma`. Each rule is derived from the manifests and task definitions rather than
hardcoded, so a new package is covered without touching the config. When knip reports something that
is genuinely reachable, prefer extending the relevant rule over adding an ignore.

`pnpm knip` runs two passes. The first checks the whole repo for unused dependencies, undeclared
imports and unreferenced files. The second adds `--production --strict`, which analyses only what
ships — no tests, stories or configs — and requires production code to import from `dependencies`
alone. That second pass is what keeps a published package from making consumers install a package
only its storybook needs. Only entry and project patterns suffixed with `!` count as production, so
a new pattern needs that suffix to be visible to it.

Unreferenced _files_ are excluded from the strict pass: some 74 components are reachable only from
stories, and whether those are work in progress or genuinely dead is a judgement per component
rather than a rule. `pnpm knip --production --strict` without the exclusion lists them.

A `peerDependencies` entry is a contract that the consumer must supply the package, so it belongs
there only when the code a consumer runs needs it. Something only a storybook or a test imports is a
`devDependency`, not a peer — the strict pass reports the difference rather than exempting it.

**The repo root's own dependencies are not audited.** They are consumed by moon task commands and the
shared vitest/vite bases rather than by the few files knip attributes to the root workspace, so
nearly all of them read as unused, and removing them breaks `pnpm install` on peer resolution. The
root workspace is still analysed — it is what supplies `vitest` and friends to every other package —
but its dependencies are ignored. Auditing them needs a pass of its own; drop the
`ignoreDependencies` entry on the `'.'` workspace to see that backlog.

### ESLint errors in vscode

To make all eslint errors look yellow in `vscode`, open your user preferences (not workspace preferences) and add this to the JSON:

```json
  "eslint.rules.customizations": [{ "rule": "*", "severity": "warn" }]
```

Alternatively to autofix all lint errors on save add the following config:

```json
  "editor.codeActionsOnSave": {"source.fixAll": true}
```

## Mobile development

Modern browsers treat `localhost` as a secure context, allowing secure apis such a `SubtleCrypto` to be used in an application served from `localhost`, however sometimes this is not enough.
For example, you may want other devices on your local network to be able to access your dev server (particularly useful when debugging issues on mobile devices).
In this case you would be accessing the app via the ip address of your host machine rather than `localhost`.
IP addresses are not a secure context unless they are served with https and a certificate. The apps in this repo are setup to serve the dev server with https when `HTTPS=true`.
What follows are instructions on how to setup the certificate for your devices to make this work as expected:

1.  Install mkcert following these [instructions](https://github.com/FiloSottile/mkcert#installation).
2.  Run `mkcert -install` to create a new local CA.
3.  Generate a cert by running `mkcert localhost $(ipconfig getifaddr en1)`.
4.  In order for the certificate to be recognized by a mobile device the root CA must be installed on the device.
    Follow these [instructions](https://github.com/FiloSottile/mkcert#mobile-devices) to enable this.
5.  Rename the cert `cert.pem` and the key `key.pem` (all `.pem` files are in `.gitignore`).
6.  The vite config uses a path relative from the CWD to load the key files and each app is setup with the following config:
7.  Update `dx-local.yml` to update the vault URL to include `https`.

<!---->

    {
      server: {
        https: process.env.HTTPS === 'true' ? {
          key: '../../../key.pem',
          cert: '../../../cert.pem'
        } : false,
        ...
      },
      ...
    }

Given this, the recommended setup is to run `serve` from the repo root and keep the `cert.pem` and `key.pem` files there.
Alternatively, a copy of them could be kept in each app directory if `serve` is run from the app directory as well.

## Service Workers

Observations of service worker behavior related to using apps w/ DXOS vault:

| Page load method                                                                     | In IFrame | Service worker behavior                                                                                 |
| :----------------------------------------------------------------------------------- | :-------- | :------------------------------------------------------------------------------------------------------ |
| New tab                                                                              | N/A       | New version waiting for activation is activated                                                         |
| Reload                                                                               | No        | New version is not activated (https://web.dev/service-worker-lifecycle/#waiting)                        |
| Reload                                                                               | Yes       | New version waiting for activation is activated (Chrome/Firefox), new version is not activated (Webkit) |
| [Hard reload](https://web.dev/service-worker-lifecycle/#shift-reload)                | N/A       | New version waiting for activation is activated                                                         |
| [Update & reload](https://vite-plugin-pwa.netlify.app/frameworks/#prompt-for-update) | N/A       | New version waiting for activation is activated                                                         |

Recommended reading for better understanding the service worker lifecycle: https://web.dev/service-worker-lifecycle.

### Vite

The easiest way to setup a PWA with Vite is to use this plugin https://vite-plugin-pwa.netlify.app/.

At present the recommendation would be to avoid the [`autoUpdate` strategy](https://vite-plugin-pwa.netlify.app/guide/auto-update.html) as it does not provide any predictability to users for when the app will update.

NOTE: the [prompt for update strategy](https://vite-plugin-pwa.netlify.app/guide/prompt-for-update.html) can be used without actually providing prompts and the app will update along the lines of the table above.
This is currently how the HALO vault's service worker is setup (though it will likely evolve later to [handle migrations](https://web.dev/service-worker-lifecycle/#activate-2)).

### Detecting unused deps

```bash
pnpm -r --filter "./packages/core/**" --filter "\!@dxos/automerge" exec depcheck --quiet --skip-missing=true --oneline  --ignores=@dxos/node-std,@bufbuild/protoc-gen-es
```

## Cloud / headless environments (Cursor Cloud, CI VMs)

### Toolchain

This project requires Node.js 24.x, pnpm 10.28.0, and moon 2.0.4, all managed by **proto** (see `.prototools`). In a cloud VM, proto is installed at `~/.proto` and must be on PATH:

```bash
export PROTO_HOME="$HOME/.proto"
export PATH="$PROTO_HOME/shims:$PROTO_HOME/bin:$PATH"
```

Do **not** use nvm; proto shims must take precedence.

### Running services

- **Composer app** (main app): `moon run composer-app:serve --quiet` starts a Vite dev server on port 5173. The app auto-creates a local identity on first load; no external auth is required.
- **Tasks app**: `moon run tasks-app:serve`
- **Docs site**: `moon run docs:serve`

See the [Run commands](#run-commands) section above for the full list.

### Gotchas

- `pnpm install` must run with `CI=true` or `HUSKY=0` in non-interactive environments to skip the husky git-hooks setup prompt.
- A remote-cache warning from moon means the certificates aren't installed. Running moon directly,
  nothing breaks — builds fall back to the local cache and just don't share the team's. Install
  them with `tools/moon-cache/install-certs.sh --op` — once per machine, covering every worktree. In GitHub Actions it is stricter: any job
  using `.github/actions/setup` **fails** when the credentials are missing or the cache does not
  answer, unless it is a fork PR or the call passes `remote-cache: 'false'`.
- The `pnpm.onlyBuiltDependencies` allowlist in `pnpm-workspace.yaml` controls which native addons are built; warnings about "ignored build scripts" for packages not in the list are normal.
- Builds must complete before running `serve` commands, because moon tasks have `deps` on `:prebuild`/`:build` targets.
- No Docker or external services are required for unit tests or local dev. Signal servers for networking tests are pre-compiled binaries spawned automatically by tests.
