# Release & Change Management

The design of DXOS release and change management: how packages are versioned and published, how apps deploy, and how a future downstream repo will consume unreleased core. Sections 1–5 describe the system as built; [§6 Future plan](#6-future-plan) covers what is designed but not yet implemented. The runbook — which button to press — is the [Releasing](../REPOSITORY_GUIDE.md#releasing) section of the repository guide; changeset authoring is [`agents/instructions/changesets.md`](../agents/instructions/changesets.md). This spec is the *why*.

## 1. Goals

Optimize for **stability, less process, more flexibility, agent-followability**:

1. A file-drop change flow (Changesets) an agent can follow — no commit-message grammar to satisfy.
2. Version **core/SDK** as one lockstep group and **plugins + CLI** as a second; **apps deploy, never publish**.
3. A **pre-release** path that is deliberate and human-gated, not per-commit noise.
4. A **linear git history** (squash-only + require-linear-history).
5. Support a future downstream repo (`ui`/`plugins`/`cli`/`composer`) that develops against **unreleased** `dxos` core through a well-defined cross-repo contract with a dependency-cycle policy (see [§6](#6-future-plan)).

## 2. Versioning policy

Two fixed/lockstep groups plus deploy-only apps:

- **Group A — Core/SDK** (~150 packages) — core + common + sdk + ui + devtools + reflect on one shared line (currently `0.9.x`). The storybook apps (`storybook-react`/`-lit`/`-solid`) ride this line (private — versioned, not published).
- **Group B — Plugins + CLI** (82 packages) — all `@dxos/plugin-*` (81) + `@dxos/cli` on a second line, published under it.
- **Apps** — every `private` app (composer-app/crx/dxos-org, docs, todomvc, tasks, testbench) deploys and never publishes. They are **not in Changesets** (`ignore`d): Composer is versioned by its deploy release (§5), the rest are unversioned.

**Independent numbers, coupled timing.** The groups carry independent version lines (a Group B-only changeset bumps B alone) but share **one** "Version Packages" PR — merging it drains all pending changesets. Independent release *cadence* comes later, when plugins move to their own repo with their own trunk + Version PR (§6), not via per-group release branches.

**Deploy ≠ publish — why Composer isn't in a publish group.** If it were, cutting a Composer build would publish all 81 plugins, and those plugins pin core versions that may not be released yet. So Composer versions on its own private line, and app deploys (`deploy-apps.yml`) are fully decoupled from the Changesets publish pipeline. This is a hard requirement: deploying an app must never publish a package.

**Membership is generated.** `fixed` matches package *names*, which share no common prefix — so each group is an enumerated list built from the pnpm project graph by `updateChangesets()` (not a filesystem scan, which would sweep in `@fixture/*` test fixtures), cross-checked against `scripts/check-publish-config.mjs`; CI asserts the generated config is in sync. Only Group B is a clean glob (`@dxos/plugin-*`). Membership shifts with a one-line generator change when the repo splits (§6).

**Catalog.** The catalog's `@dxos/*` self-references (`@dxos/client`, `@dxos/echo`, `@dxos/wa-sqlite`) violate the "in-repo deps must be `workspace:*`" rule. Removing them makes every internal edge `workspace:*` (Changesets-native) and avoids the maturing `--enable-pnpm-catalog` flag. (`workspace:` / `catalog:` tokens rewrite to concrete versions at pack time — none leak into a published tarball.) `@dxos/wa-sqlite` is assessed separately (may be a genuine external publish).

## 3. Tooling — Changesets

`.changeset/config.json` is **generated** by the toolbox (`updateChangesets()`) from the workspace/project graph on `pnpm install` — that file is the source of truth. The non-default settings that carry design intent:

- **`fixed`** — the two enumerated lockstep groups (A: core/SDK + storybook; B: `@dxos/plugin-*` + `@dxos/cli`), regenerated from the graph. `fixed` (not `linked`) because it bumps and publishes all members together every release; `linked` would only sync packages that changed — not what the core/SDK surface wants.
- **`privatePackages: { version: true, tag: false }`** — version private group members (storybook, Composer) but never tag or publish them; deploy-only apps get no changeset, so never bump.
- **`snapshot`** — the `@next` template (calculated base version + commit suffix, e.g. `0.10.0-next-<commit>`).
- **`bumpVersionsWithWorkspaceProtocolOnly`** and **`onlyUpdatePeerDependentsWhenOutOfRange`** — part of the semver-cascade fix (below).
- Otherwise standard: `@changesets/changelog-github`, `access: public`, `baseBranch: main`, `updateInternalDependencies: patch`.

**Standard semver at every version.** At `0.x`, breaking rides the **minor** (`0.9.0 → 0.10.0`) and `major` is reserved for the deliberate `1.0.0` cut. A `minor` does **not** cascade the group to `1.0.0`. Bump-level rules live in the [authoring guide](../agents/instructions/changesets.md); the mechanism below is kept out of it.

**Preventing the `0.x` → `1.0.0` cascade.** Left alone, a `minor` on a `0.x` fixed-group member escalates the whole group to `1.0.0`: a `workspace:*` peerDependency (pnpm pins it exact) reads as out-of-range on any bump, and Changesets force-escalates an out-of-range peer-dependent to `major`. Three things together prevent this, giving standard semver at every version:

1. `peerDependencies` → `workspace:^` (regular deps stay `workspace:*`).
2. `onlyUpdatePeerDependentsWhenOutOfRange: true`.
3. a local `@changesets/assemble-release-plan` patch (`patches/`) making a `0.x` out-of-range peer-dependent bump `minor`, not `major`.

The flag and the patch cover **different regimes** — pre-1.0 a minor is out of range so the patch does the work (flag inert); ≥1.0 a minor stays in range so the flag suppresses the force-bump (patch's branch unreached). Both are needed. The flag is an unstable escape-hatch option and the patch targets the CJS build the CLI loads (`dist/*.cjs.js`); re-verify after any `@changesets/*` upgrade — pnpm fails loudly on install if the patch stops applying.

**Agent ergonomics — the core win.** To record a release an agent writes one file, `.changeset/<slug>.md` (front-matter naming a package + bump level, then a changelog line) — no commit grammar, no interactive prompt, no history parsing. When and what to write is in the authoring guide. `scripts/check-changeset.mjs` is advisory — the **Check** workflow's `changeset-reminder` job posts a sticky comment when a publishable change has none, never blocking; `.changeset/` holds only real entries (no empty changesets).

**Version files.** `scripts/sync-versions.mjs`, run inside `changeset:version` and in every deploy/publish path, stamps `version.ts` (`DXOS_VERSION` — client packages from Group A, `@dxos/cli` from Group B) and `composer-app/src-tauri/tauri.conf.json` from each file's owning package version. A `--check` mode gates drift in **Check**.

## 4. Branch model — trunk on `main`

- A single long-lived `main`: squash-only PRs + "require linear history" ruleset + merge queue (CI handles `merge_group`). No long-lived release or environment branches. *(Enabling the ruleset + merge queue and deleting the old branches are privileged human actions — see §5 pending setup.)*
- Releases land as the squashed "Version Packages" PR plus a tag — no cross-branch merges.
- Pre-releases publish as `@next` **snapshot releases** — manually triggered, no `pre` mode, no long-lived branch.
- Apps deploy from `main` and tags, decoupled from package versions.

**Release lines are additive.** Pre-1.0 we run two channels — `main → @latest` and `@next` snapshots — and deliberately do not split `next-minor`/`next-major` lines or maintain an old major yet. Changesets keeps this additive: each track is just a branch + its own `--tag` + trigger, addable later with no rework. Triggers to add a line later: a consumer pins an old major needing patches; a breaking SDK rewrite must bake for months; or a minor and major mature at once. Footgun: never run `changeset pre enter` — it freezes all stable releases until `pre exit`; we use snapshots for `@next` instead.

## 5. Release execution — Action-driven, human-gated

All mechanics run in GitHub Actions; the human's only actions are **merging an auto-generated PR** and **clicking Run workflow** — never a local command sequence. Step-by-step is the [Releasing runbook](../REPOSITORY_GUIDE.md#releasing); this section is the design.

**Publishing lives in `publish-all.yml` for both channels** because npm's OIDC trusted publisher is bound to that workflow filename — so the **trigger selects the channel**:

- **`@latest`** — push to `main` maintains the "Version Packages" PR (consuming `.changeset/*.md`, bumping versions, writing changelogs); **merging that PR** triggers the publish (npm OIDC + `--provenance`) and the `@latest` tags.
- **`@next`** — a `workflow_dispatch` runs `changeset version --snapshot next` + `sync-versions`, then `changeset publish --tag next --no-git-tag`. Versions are throwaway (`X.Y.Z-next-<commit>`); nothing is committed, no git tags, no-op when no changesets are pending. No `pre` mode anywhere — `publish-all.yml` fails fast if a stray `.changeset/pre.json` appears.

Per-commit unreleased code is served by **pkg.pr.new** (§6 covers how a downstream repo consumes it), not npm.

### App deploys

The environment matrix and how-to are in the [runbook](../REPOSITORY_GUIDE.md#releasing); the design decisions:

- **One workflow, `deploy-apps.yml`.** Deployable apps are listed in `.github/workflows/scripts/apps.mjs`; everything else — Worker name, bundle task, output dir, target environments — derives from each app's committed `wrangler.jsonc` (no separate manifest). A `plan` job resolves the run into named booleans so downstream `if:`s stay readable.
- **Environment is a deploy parameter, not a git branch.** The app set follows the env (`main` auto on push; `labs`/`staging`/`production` by dispatch), with an optional `app` input to narrow to a single app (a hotfix).
- **Cloudflare Workers Static Assets** (Pages deprecated): `wrangler deploy --config <app>/wrangler.jsonc --env <env>`, one Worker per env (`production` = the bare name carrying the custom domain, others `<name>-<env>`). Composer isn't pure-static — its `_worker.js` (R2 feedback-logs, RSS + OTel proxies) is the Worker `main` with assets bound + `run_worker_first: ["/api/*"]`; the rest are assets-only.
- **Composer is the only versioned app.** A production deploy's `release` job bumps `composer-app`/`crx` by the dispatch `bump` input, commits to `main`, tags `composer-v<x>`, and the rest of the run builds + deploys that commit (web + desktop + iOS). Docs/examples are unversioned and just deploy. Desktop/iOS run in `build-tauri.yaml` (CrabNebula) for `labs`/`staging`/`production` only — a signed build per `main` push is too costly; iOS → TestFlight on `labs`.
- **Tracking what's deployed where:** per-app floating `<app>/<env>` git tags, force-updated each deploy (e.g. `git diff composer/staging..composer/production`). No GitHub Environments; the deliberate dispatch is the gate.
- **Build-sharing:** Composer's web bundle is built once by a `build-bundle` job and shared via artifact to the web + Tauri jobs (they skip rebuilding). Remote cache may be used on `main`; `labs`/`staging`/`production` do a full clean build — a stale/corrupt cache entry must never reach a user-facing deploy (reliability, not security).

**Pending human setup** (privileged, not agent-doable). Before production is live — **Cloudflare:** give `CLOUDFLARE_API_TOKEN` **Workers Scripts: Edit**; per `composer-<env>` Worker create its R2 bucket + `SIGNOZ_INGESTION_KEY` secret; move the custom domains off the Pages projects onto the production Workers (deploy the Workers first, then switch — no gap); disable docs' Cloudflare git auto-build; retire the Pages projects. **GitHub:** enable the require-linear-history ruleset + merge queue; delete the old long-lived branches once the pipeline is proven (back up tips first). `preview-deploy.yml` (per-PR previews) stays on Pages as a separate follow-up.

## 6. Future plan

Not yet implemented — relevant once `edge` integration or the repo split starts. Two related workstreams: a **cross-repo contract** for depending on unreleased code, then the eventual **repo split**.

### Cross-repo development

A downstream repo (`edge` today; the future `composer` repo) consumes **unreleased** `dxos` core through three tiers:

| Tier | Mechanism | Use | Committed? |
| --- | --- | --- | --- |
| **1 — Stable floor** | npm `@latest` (or deliberate `@next`) | Default deps; what ships to users | yes (pinned range) |
| **2 — Continuous** | pkg.pr.new SHA-pinned URL | Land on `main` against an upstream change not yet released | yes (re-pin to a release later; perishable) |
| **3 — Local dev** | `link-packages.mjs` (tarball + `pnpm.overrides`) | Editing both repos at once on one machine | never (CI guard rejects `file:`) |

Decision: editing two repos locally → Tier 3, unlink before committing; need `main` to build against an unreleased upstream change → Tier 2, re-pin to a real release when upstream releases (pkg.pr.new artifacts expire ~1–6 months); cutting/preparing a release → Tier 1. Enablement: generalize `link-packages.mjs` from `edge/scripts/` into `dxos` and forbid its `--commit` path in CI; add a Tier-2 bot that bumps SHA-pinned pkg.pr.new URLs; validate on `edge` (`edge-tests.yml`).

### Dependency & cycle policy

Grounded in industry practice (Rush subspaces, Go's import-cycle ban, *SWE at Google* on diamond deps, Cargo publish semantics). Today `dxos`↔`edge` is one-way (`edge` → `dxos`, all-private), so no cycle exists yet.

1. **The global package graph (union of all repos) MUST be a DAG.** The unit is the published *package*, not the repo; no package may transitively depend on itself.
2. **Repo-level reference cycles are ALLOWED** — A may depend into B while B depends into A, provided no individual *package* cycle exists. This lets repos keep coarse, natural boundaries.
3. **Package-level cycles are FORBIDDEN, even through published versions** — they forfeit atomic change and cause confusing version ripple. Break them by extracting shared definitions downward.
4. **Shared definitions go in a leaf contract/schema package** at the bottom of the stack (the proto/IDL pattern), depended on by both sides — never sideways. For DXOS that is `@dxos/protocols` / schema / `*-types`. Caveat: `@dxos/protocols` is *near*-leaf but not pure; a cross-repo contract package must be genuinely low-level (or carry its commons as leaves). *Worked example:* moving schema into `edge`, publishing it, and having `dxos` core depend on it is fine — iff that package doesn't transitively depend back on `dxos` core.
5. **Committed cross-repo edges use pinned published versions only** (Tier 1/2); Tier 3 is dev-only.
6. **Contain the cross-repo diamond:** single-version policy for shared third-party deps + `peerDependencies` for shared contract packages + automated bumps (Renovate/Dependabot).
7. **Enforcement** — across repos there is no workspace, so the DAG must be enforced explicitly: **(a)** a generated package→repo ownership map + a `check-package-cycles.mjs --cross-repo` mode that unions every repo's `@dxos/*` edges (reusing `edge-tests.yml`'s dual-checkout) and fails on any multi-node SCC — a required PR check + scheduled drift job; **(b)** a cheap layer-direction lint (`contracts < core < edge/app`) failing on upward/sideways edges; **(c)** a release-toposort backstop that fails if a cycle slipped through.
8. **Bias toward not splitting** — per *SWE at Google*, prefer source-control problems over dependency-management ones; every cut edge is a versioning cost paid every release.

### Repo split (one-way door)

Only after the cross-repo contract is proven on `edge`. The history extraction is irreversible.

- **Repo A (`dxos`):** `core/*`, `sdk/*` minus `app-*`, `common/*`, `reflect/introspect*`, non-UI `experimental/*`, `devtools/vscode-extension`, `tools/*`, `vendor/*`.
- **Repo B (`composer`):** `ui/*`, `plugins/*`, `sdk/{app-framework,app-toolkit,app-graph,app-solid,shell,examples}`, `@dxos/cli` + `cli-util`, `@dxos/devtools` + `devtools-extension`, `storybook-utils`, `stories/*`, `apps/*`, `tools/storybook-*`.

The `sdk/app-*` packages + `shell` are the plugin-SDK layer (not storybook back-edges) — moving them collapses most of the cut. Genuine back-edges to clean first:

| Back-edge | Fix |
| --- | --- |
| `@dxos/schema`, `@dxos/types` — react-ui *devDep* for demo stories | Delete/inline the story; drop the devDep |
| `@dxos/react-client` — react-ui `ErrorBoundary` in a test decorator | Swap to `@dxos/react-error-boundary` (Repo-A common) |
| `@dxos/keyboard` — story-only | Move story to Repo B `stories-ui` |
| `@dxos/storybook-utils` — react-ui *peerDep* | Move to Repo B |
| `assistant-e2e`/`assistant-evals` (private); `assistant-toolkit` (plugin imports in `*.test.ts` only) | Move e2e/evals + the toolkit's plugin tests to Repo B |
| `@dxos/blade-runner` — `@dxos/plugin-script` | Default to Repo B (or sever the dep) |

Sequence (CI green throughout): (1) cleanup PR in Repo A removing back-edges; (2) `check-cycles.mjs` + `check-package-cycles.mjs` confirm acyclic; (3) tag `pre-split`; (4) `git filter-repo` the Repo-B path set into the new repo + bootstrap its workspace / catalog subset / `.moon` / CI / Changesets / `link-packages.mjs`; (5) delete moved dirs from Repo A (globs, tsconfig paths, the `app-framework` `DEFAULT_PACKAGES` allowlist); (6) publish Repo A `0.10.0`; Repo B switches its catalog floor from a pkg.pr.new SHA to an npm range. No compat shims. Also resolve the duplicate `reflect/introspect*` vs `core/compute/introspect*`.

## 7. Risks / one-way doors

- **Changesets × pnpm catalog** — the main tooling unknown; fallback is removing `@dxos/*` from the catalog (see §2).
- **One-way doors** — any real `@latest` publish, branch deletion (back up tips), and the repo-split history extraction (tag `pre-split`).
- **Cross-repo diamond / version skew** — created by splitting; mitigated by the single-version + contract-package policy (§6).
