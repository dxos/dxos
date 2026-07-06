# Release & Change Management

Status: **Draft / target design.** This spec defines where DXOS release and change management is heading and tracks what is in place versus what is planned. It is a living document — each phase updates the status tags below as work lands.

Status legend used throughout:

- ✅ **in place today** — already true of the repo.
- 🔄 **changing** — exists today but this program replaces or reshapes it.
- ⬜ **net-new** — does not exist yet.

## 1. Goals

The redesign optimizes for **stability, less process, more flexibility, and agent-followability**. Concretely:

1. Replace **release-please + conventional commits** with a lighter, well-defined flow an agent can follow by dropping a file. 🔄
2. Version **core/SDK packages together** (one lockstep group) and **plugins + CLI together** (a second lockstep group), and let **apps (Composer, docs, todomvc, tasks, testbench) deploy without any npm publish**. 🔄
3. Keep a **pre-release** path, but make it a **deliberate, human-gated** action rather than per-commit noise. 🔄
4. Keep a **clean, linear git history**. ✅ (preserved via squash-only + linear-history rules)
5. Support a future **third repo** (`ui` + `plugins` + `cli` + `composer`/apps) that develops against **unreleased** `dxos` core through a well-defined, agent-followable cross-repo contract, with a clear **dependency-cycle policy**. ⬜

The reference design is Effect-TS. Effect v3 (`Effect-TS/effect`) uses Changesets with independent versioning, three long-lived release branches, and a custom merge queue. Effect v4 (`effect-smol`) deleted that complexity: one fixed lockstep group (`"fixed": [["effect","@effect/*"]]`), single-track `main`, and Changesets `pre` mode for pre-releases. **DXOS targets the v4 shape**, plus a hybrid config (**two `fixed` groups** — core/SDK, and plugins+CLI) that neither Effect version uses but both of which fit in one `.changeset/config.json`. See [Appendix A](#appendix-a--what-effect-does-v3-vs-v4).

## 2. Current state (what exists today)

| Area | Today | Disposition |
| --- | --- | --- |
| Versioning | All ~400 packages lockstep at one version (`0.9.0`) | 🔄 split into two fixed publish groups (core/SDK; plugins+CLI); apps deploy, never publish |
| Version config | `release-please-config.json` (~1,409 lines) regenerated on `pnpm install` by `tools/toolbox/src/toolbox.ts::updateReleasePlease()` | ✅ replaced by generated `.changeset/config.json` (`updateChangesets()`); old config + generator method deleted |
| Change intent | Conventional-commit PR titles validated by `amannn/action-semantic-pull-request` | 🔄 replaced by `.changeset/*.md` files |
| Branches | `main` / `staging` (force-pushed) / `production` / `labs` / `dev` + cut `rc-*` / `hotfix-*`; `rc → production → main` `--no-ff` chain | 🔄 collapse to trunk on `main` |
| Continuous publish | Every push to `main`/`staging`/`labs` publishes `X.Y.Z-<tag>.<sha>` to npm | 🔄 removed; pkg.pr.new carries continuous code |
| Preview / canary | `pkg-pr-new.yml` publishes every `main` commit to pkg.pr.new; `preview-deploy.yml` deploys composer per-PR | ✅ kept |
| Cross-repo | `edge` repo consumes `dxos` (one-way today); `link-packages.mjs` (tarball + `pnpm.overrides`) lives in `edge/scripts/` | 🔄 formalized into a three-tier contract |
| Cycle checks | `scripts/check-cycles.mjs` + `scripts/check-package-cycles.mjs` (intra-repo only) | 🔄 extended for cross-repo |

## 3. Versioning policy

Two fixed/lockstep groups, plus deploy-only apps:

- **Group A — Core/SDK** (fixed lockstep) 🔄 — core + common + sdk + ui + devtools + reflect, versioned together on one shared line (continues from `0.9.0`). The three storybook apps (`storybook-react` / `-lit` / `-solid`) ride this line too (private — versioned but not published). ~150 packages.
- **Group B — Plugins + CLI** (fixed lockstep) 🔄 — all `@dxos/plugin-*` (81) + `@dxos/cli` share one version line and **publish to npm** under it. Plugins are **no longer independently versioned**. 82 packages.
- **Apps deploy, never publish** ✅ / 🔄 — every `private: true` app (Composer `composer-app` / `composer-crx` / `composer-dxos-org`, `docs`, `todomvc`, `tasks`, `testbench-app`) deploys via its own pipeline and **never** triggers an npm publish. **Apps are not in Changesets at all** (they're `ignore`d) — Composer is versioned by its release workflow, the rest are unversioned. Full model: the [App deploys](#app-deploys-) section (§6).

**Independent version numbers, coupled release timing.** The two groups carry independent version *lines* (a Group B-only changeset bumps B alone), but they share **one** "Version Packages" PR — merging it drains *all* pending changesets, so whatever core + plugin bumps are queued publish in the same merge. Releasing one group while the other has pending changesets is **not** a goal pre-split: independent release *cadence* arrives with the Phase 4 repo split (plugins move to their own repo, with their own trunk + Version PR), **not** via per-group release branches.

**Deploy ≠ publish (hard requirement).** Deploying any app must never publish a package. App deploys run in `deploy-apps.yml` (`wrangler deploy` to Workers Static Assets / Tauri build), fully decoupled from the Changesets publish pipeline. This is *why Composer is not in a publish group*: if it were, cutting a Composer build would publish all 81 plugins, and those plugins would pin core versions that may not be released yet (the hazard). Composer therefore versions on its own private line and ships with no npm release.

**Group membership (generated).** Changesets `fixed` matches package **names**, not directory paths, and `@dxos/echo` / `@dxos/client` / … share no common prefix — so each group is an **enumerated list, auto-generated from the pnpm workspace/project graph** (not a filesystem scan, which would sweep in test fixtures such as `@fixture/pkg-b` under `src/__fixtures__/`). Membership is cross-checked against `scripts/check-publish-config.mjs`. Only `@dxos/plugin-*` is a clean glob (Group B). At the repo split, `ui/*` + `sdk/app-*` leave Group A and Group B (plugins + cli) moves wholesale to the new repo — a one-line change in the generator.

**Catalog note.** The pnpm catalog currently carries `@dxos/*` self-references (`@dxos/client`, `@dxos/echo`, `@dxos/wa-sqlite`), which violate the "in-repo deps must be `workspace:*`" rule. Removing them makes every internal edge `workspace:*` (which Changesets handles natively) and avoids depending on the still-maturing `--enable-pnpm-catalog` flag. `@dxos/wa-sqlite` is assessed individually (it may be a genuinely external publish). 🔄

## 4. Tooling — Changesets ⬜

`.changeset/config.json`, generated by the toolbox (replacing `updateReleasePlease`):

```jsonc
{
  "$schema": "https://unpkg.com/@changesets/config@3.1.1/schema.json",
  "changelog": ["@changesets/changelog-github", { "repo": "dxos/dxos" }],
  "commit": false,
  "access": "public",
  "baseBranch": "main",
  "updateInternalDependencies": "patch",
  "bumpVersionsWithWorkspaceProtocolOnly": true,  // regular deps workspace:*; peer deps workspace:^ (caret); pnpm rewrites at pack time
  "fixed": [
    [ /* Group A: core/sdk/common/ui/devtools/reflect names + storybook-{react,lit,solid}, generated */ ],
    [ /* Group B: @dxos/plugin-* (81) + @dxos/cli */ ]
  ],
  "linked": [],
  "ignore": [],
  "privatePackages": { "version": true, "tag": false },  // version private members of fixed groups (storybook, Composer); never tag/publish them. Deploy-only apps simply never receive a changeset, so they never bump.
  "snapshot": { "useCalculatedVersion": true, "prereleaseTemplate": "{tag}-{commit}" },  // @next snapshot version e.g. 0.10.0-next-<commit>
  // Only escalate a peerDependent to major when the dep actually leaves its range; paired with the local
  // @changesets/assemble-release-plan patch (a 0.x out-of-range peer change becomes a minor, not a major).
  "___experimentalUnsafeOptions_WILL_CHANGE_IN_PATCH": { "onlyUpdatePeerDependentsWhenOutOfRange": true }
}
```

`fixed` (not `linked`): `fixed` bumps and publishes all members together every release — today's lockstep behavior. `linked` only syncs packages that actually changed, which is not what we want for the core/SDK surface.

**Agent ergonomics (the core win).** To record a release, an agent writes one file — `.changeset/<slug>.md`:

```md
---
"@dxos/echo": patch
---
Fix subscription leak in the query handler.
```

No commit-message grammar, no interactive prompt, no history parsing. This is strictly easier for an agent than satisfying release-please's commit parser.

**Changeset authoring (agent guide).** When to write a changeset, which package to name (one member bumps its whole `fixed` group), bump levels (**standard semver** — at `0.x` breaking rides the `minor`; the old minor→`1.0.0` cascade is fixed, see the de-risk note below), and changelog-quality body text are specified in [`agents/instructions/changesets.md`](../../agents/instructions/changesets.md). The rule: add a `.changeset/*.md` when the change is consumer-relevant (worth a changelog entry); otherwise omit it — the code ships with the next release either way (no empty changesets — `.changeset/` holds only real entries). `scripts/check-changeset.mjs` is **advisory** — the **Check** workflow's `changeset-reminder` job posts a sticky comment when a publishable change has none, never blocking. The guide is promoted into the core `CLAUDE.md` when the conventional-commit PR-title gate is retired (after the first Changesets release).

**Version files.** `version.ts` for `@dxos/client` / `@dxos/client-services` is stamped from **Group A**; `@dxos/cli`'s `version.ts` from **Group B**; `composer-app/src-tauri/tauri.conf.json` from **`composer-app`'s own independent version** (not a publish group) — all by a `scripts/sync-versions.mjs` step run inside `changeset:version` (today these are release-please `extra-files`). ⬜

## 5. Branch model — trunk on `main` 🔄

- A single long-lived `main`. Squash-only PRs + GitHub "require linear history" ruleset + merge queue (CI already handles `merge_group`).
- Releases land as the squashed Changesets **"Version Packages" PR** plus a tag — no cross-branch merges. The mechanics run in GitHub Actions (Section 6); no one runs release commands locally.
- Pre-releases publish as **snapshot releases** to the `@next` dist-tag — manually triggered (`workflow_dispatch`), with no Changesets `pre` mode and no long-lived branch.
- Apps deploy from `main` and tags, decoupled from package versions.
- **Retired**: `production` / `staging` / `labs` / `dev` long-lived branches, the `rc-*` / `hotfix-*` flow, and the `rc → production → main` `--no-ff` chain (the structural source of today's non-linear history).

### Additional release tracks (future — kept additive) ⬜

Pre-1.0 we run **two channels**: stable `main` → `@latest`, and snapshot `@next` (Section 6). We deliberately do **not** split prereleases into separate `next-minor` / `next-major` lines or maintain an old major yet — that is acceptable at the `0.x` stage and is deferred. Changesets keeps it additive: it has no native multi-track feature, so each track is just a branch + its own `--tag` + trigger; adding one later does not disturb the existing setup. (Effect v4's current single-track `main` is likewise a transient pre-release artifact — the whole v4 line sits in `pre` mode on `@beta` — while Effect v3's steady state was a multi-line train; expect DXOS to add lines post-1.0 too.)

- **What stays the same when a line is added:** the `fixed` core/SDK group versions together on whatever line a branch represents — it works identically on a release branch, no config change.
- **What you ADD when a line is needed** (no rework to the trunk + snapshot setup):
  - A maturing minor **and** major pooled independently: the Effect-v3 `next-minor` + `next-major` **release train** (with a routing / merge-queue action). Only worth the bespoke tooling at that complexity.
  - A maintained **old major (LTS)**: a `vN` branch with a *diverged* `.changeset/config.json` (`baseBranch: "vN"`), publishing `--tag latest-1` / `lts` (npm dist-tags must not start with a digit or `v`). Until a consumer actually pins an old major, the lightweight `npm dist-tag add` approach (tRPC `v10`, Turborepo `turbo-2.3`) suffices.
- **Triggers to introduce a new line:** (1) a real consumer pins an old major needing patches; (2) a breaking SDK rewrite must bake for months while patches keep shipping; (3) both a minor and a major maturing at once.
- **Footguns to respect:** never run `changeset pre enter` (it freezes all stable releases until `pre exit` — the exact Effect-v4 trap; we avoid `pre` mode entirely and use snapshot releases for `@next`); `baseBranch` is single-valued and `changesets/action` has no multi-branch input, so a future maintained old major = its own branch + diverged config + `--tag` + trigger; in a `fixed` group every prerelease re-publishes the whole locked group.

## 6. Executing releases & pre-releases — Action-driven, human-gated 🔄

**All release mechanics run in GitHub Actions.** Nobody runs `changeset` / `git` / `pnpm publish` commands on a laptop. "Human-gated" means the human's only actions are **clicking "Run workflow" (a `workflow_dispatch`)** and **merging an auto-generated PR** — never a local command sequence. The `docs/RELEASING.md` runbook (Phase 2) documents which button to press, not commands to type.

### Full release

Driven by `publish-all.yml` (push to `main`). The Changesets action maintains the **"Version Packages" PR** (consuming `.changeset/*.md`, bumping versions, writing changelogs). The human gate is **merging that PR**; the merge triggers the publish (npm OIDC + `--provenance`) and tags `@latest`. The only human actions in the whole loop: add a `.changeset/*.md` to feature PRs, then merge the Version Packages PR. (An optional `workflow_dispatch` entry on `publish-all.yml` allows an on-demand publish without waiting for the next push.) The publish stays in `publish-all.yml` because npm's OIDC trusted publisher is bound to that workflow filename.

### Pre-release

Per-commit unreleased code is served by pkg.pr.new (Section 7), **not** by publishing to npm. The deliberate `@next` prerelease channel uses **Changesets snapshot releases** — no `pre` mode, no `.changeset/pre.json`, and no long-lived branch:

- **Manually triggered.** A `workflow_dispatch` on `publish-all.yml` (the same workflow as `@latest` — npm's OIDC trusted publisher is bound to that filename, so the trigger selects the channel) runs `changeset version --snapshot next` (calculated base version + commit suffix → `X.Y.Z-next-<commit>`, per the `snapshot` config) + `sync-versions`, then `changeset publish --tag next --no-git-tag`. Nothing is committed and no git tags are created — snapshots are throwaway. No-op when there are no pending changesets.
- **No `pre` mode anywhere.** We deliberately avoid `changeset pre enter` (the Effect-v4 trap: it freezes stable releases until `pre exit` and pins `pre.json` to a branch). Snapshots need none of that. `publish-all.yml` still **fails fast if `.changeset/pre.json` ever appears** as a defensive guard.
- `main` keeps publishing `@latest` via its "Version Packages" PR (above). The two channels are independent and need no cross-branch sync.
- **Apps-split simplification:** once applications move to the separate repo, the only npm action here is "publish packages" — no app-deployment-vs-package-publish distinction to encode.

### App deploys 🔄

Apps (Composer, docs, storybook, todomvc, tasks, testbench) **deploy, never publish** — they build from workspace source, are **not in Changesets** (`ignore`d), and never touch npm. Deploy is fully decoupled from package publishing: if Composer were in a publish group, cutting a build would publish all 81 plugins pinning possibly-unreleased core. So Composer versions on its own line (bumped by its release path below); docs/examples are unversioned.

**One workflow, `deploy-apps.yml`.** The deployable apps are listed in `.github/workflows/scripts/apps.mjs` (a package dir each); everything else — Worker name, bundle task, output dir, target environments — is derived from that app's committed `wrangler.jsonc` (there is no separate manifest). A `plan` job resolves the run into named booleans (env, which jobs run) so the other jobs' `if:` stay readable. Environment is a **deploy parameter, not a git branch** (the long-lived `production`/`staging`/`labs`/`dev` branches are retired); the app set follows the env, with an optional `app` input to narrow to one app (a hotfix):

| Env | Trigger | Apps | Notes |
| --- | --- | --- | --- |
| **main** | auto on push to `main` | all main-enabled | rolling preview |
| **labs** | manual dispatch | composer | prerelease Tauri build |
| **staging** | manual dispatch | composer + docs | prerelease Tauri build |
| **production** | manual dispatch | all | cuts the versioned Composer release (below) |

**Cloudflare Workers Static Assets** (Pages is deprecated). `deploy-env.mjs` runs `wrangler deploy --config <app>/wrangler.jsonc --env <env>`; one Worker per env (`production` = the bare name that carries the custom domain, others `<name>-<env>`). Composer isn't pure-static — its `_worker.js` (R2 feedback-logs, RSS + OTel proxies) is the Worker `main` with assets bound + `run_worker_first: ["/api/*"]`; the rest are assets-only.

**Composer production release** — the only path that advances Composer's version (it isn't in Changesets): a production deploy's `release` job bumps `composer-app`/`crx` by the dispatch `bump` input, commits to `main`, tags `composer-v<x>`, and the rest of the run builds + deploys that commit (web + desktop + iOS). A single non-Composer app deploy to production (e.g. a docs hotfix) skips the release job; docs/example apps are unversioned and just deploy + move their pointer tag.

**Desktop / mobile** run in `build-tauri.yaml` (CrabNebula) for labs/staging/production (not `main` — a signed build per push is too costly): production → the clean version on the primary CN channel; labs/staging → a per-commit prerelease on that env's channel; iOS → TestFlight on `labs` only.

**Tracking what's deployed where** (what branches gave for free): per-app floating **`<app>/<env>` git tags** (non-`main`), force-updated on each deploy — e.g. `git diff composer/staging..composer/production`. No GitHub Environments; human gating is the deliberate dispatch.

**Build-sharing (implemented).** Composer's web bundle is built **once** by a `build-bundle` prep job and shared via artifact: the web `deploy` job and the native Tauri jobs download it and skip rebuilding (`bundle-env.mjs` skips an already-populated output dir; Tauri's `beforeBuildCommand` is empty and it embeds the artifact, falling back to `moon run` only on a standalone dispatch). Web-side validated green on labs (`Using prebuilt bundle for composer … skipping`); the signed native path proves out on a manual labs dispatch. Remote-cache policy: the prep job may use the Depot cache on `main`; full clean build on labs/staging/production (a stale/corrupt cache entry must never reach a user-facing deploy — reliability, not security).

**Cloudflare-side setup (human, not agent-doable).** Before production is live: give `CLOUDFLARE_API_TOKEN` **Workers Scripts: Edit**; create each `composer-<env>` Worker's R2 bucket + `SIGNOZ_INGESTION_KEY` secret; attach the custom domains to the production Workers, moving them off the Pages projects (deploy the Workers first, then switch the domains — no gap); disable docs' Cloudflare git auto-build once the Actions deploy is verified; then retire the Pages projects. Still on Pages as a separate follow-up: `preview-deploy.yml` (per-PR previews via branch-alias URLs).

## 7. Cross-repo development ⬜

When the `ui`/`plugins`/`cli`/`composer` repo is split out, it consumes **unreleased** `dxos` core through three tiers (the same tiers apply to `edge` today). This section doubles as the **agent guide** for developing against unreleased cross-repo code — a **follow-up**, relevant once `edge` integration or the repo split actually starts:

| Tier | Mechanism | Use | Committed? |
| --- | --- | --- | --- |
| **1 — Stable floor** | npm `@latest` release (or deliberate `@next`/`@beta`) | Default downstream deps; what ships to users | ✅ yes (pinned range) |
| **2 — Continuous** | **pkg.pr.new** SHA-pinned URL | Land something on `main` that needs an upstream change **not yet released** | ✅ yes (re-pin to a release later; perishable) |
| **3 — Local dev** | `link-packages.mjs` (tarball + `pnpm.overrides`) | Editing **both repos at once** on one machine | ❌ **never** (CI guard rejects `file:` / `.local-pack`) |

Decision tree:

1. *Editing two repos at once, locally?* → check out both repos side-by-side, run `link-packages.mjs <upstream-repo>` (Tier 3). Unlink and depend on a real version before committing.
2. *Need to merge on `main` against an upstream change that isn't released?* → pin the dep/catalog to the upstream commit's **pkg.pr.new** SHA URL (Tier 2). Re-pin to a real release once upstream releases (pkg.pr.new artifacts expire ~1 month idle / ~6 months).
3. *Cutting or preparing a release?* → depend on a **published npm** version (Tier 1).

## 8. Cross-repo dependency & cycle policy ⬜

Grounded in industry practice (Microsoft Rush subspaces RFC, Go's import-cycle ban, *Software Engineering at Google* on diamond dependencies, Cargo publish semantics). Today `dxos`↔`edge` is effectively one-way (`edge` → `dxos`; `edge` is all-private with no npm publish), so no cycle exists yet.

1. **The global package graph (union of all repos) MUST be a DAG.** The unit of the rule is the published **package**, not the repo. No package may transitively depend on itself.
2. **Repo-level reference cycles are ALLOWED.** Repo A may depend into B while B depends into A, provided no individual package cycle exists. Reviewers and CI check the *package* graph, not the repo arrows. This is what lets repos keep coarse, natural boundaries instead of being split into ever-smaller package sets to avoid back-references.
3. **Package-level cycles are FORBIDDEN — even through published versions.** They are bootstrappable in theory (a published version is a frozen snapshot, so the regress terminates) but forfeit atomic change and cause confusing version ripple (cf. Cargo's publish-strip-restore workaround). Break them by extracting shared definitions downward.
4. **Shared definitions go in a leaf contract/schema package** at the bottom of the stack (the proto/IDL pattern), depended on by both sides — never sideways between them. For DXOS this is the role of `@dxos/protocols` / schema / `*-types`. Caveat: `@dxos/protocols` is *near*-leaf (→ `@dxos/keys` → `@dxos/debug` → `@dxos/node-std`) but not pure; a contracts package shared across repos must be genuinely low-level (or carry those commons with it as leaves).
   - **Worked example.** Moving API schema definitions into `edge`, publishing them, and having `dxos` core depend on them is fine — *iff* the schema package is a leaf that does not transitively depend back on `dxos` core. If it does, that closes a package cycle → factor the schemas lower.
5. **Cross-repo edges in committed code use pinned published versions only** (Tier 1/2). Tier 3 (link) is dev-only.
6. **Contain the cross-repo diamond.** Single-version policy for shared third-party deps + `peerDependencies` for shared contract packages + automated version bumps (Renovate/Dependabot).
7. **Enforcement.** Within one repo the pnpm workspace plus `scripts/check-package-cycles.mjs` give us a DAG for free; **across repos there is no workspace, so the DAG must be enforced explicitly.** A layered mechanism (built in Phase 3):
   - **(a) Ownership map + union-graph check (primary gate).** A generated, version-controlled **package → repo ownership map** (each repo derives its public package list; the maps compose into "which package lives where"). Extend `check-package-cycles.mjs` with a `--cross-repo` mode that reuses the existing dual-checkout pattern from `edge-tests.yml` (which already checks out both `dxos` and `edge` in CI): union every repo's `@dxos/*` package→package edges into one graph and fail on any strongly-connected component larger than one node. Runs as a required PR check in each repo (so a PR introducing a cross-repo package cycle fails *before* merge) and on a schedule (to catch drift from already-merged published versions).
   - **(b) Layer-direction lint (cheap defense-in-depth).** A declared tier per repo/package (`contracts < core < edge/app`) with an `O(edges)` lint that fails on any "upward" or sideways cross-repo edge. Needs no network; catches the common case fast.
   - **(c) Release toposort backstop.** The publish orchestrator computes a topological publish order and **fails to find one** if a cross-repo package cycle slipped through — the final safety net.
8. **Bias toward not splitting.** Per *SWE at Google*, prefer source-control problems over dependency-management problems; every edge cut between repos becomes a versioning cost paid on every release.

## 9. Migration phases

```
Phase 0  Author this spec + the agent cross-repo guide            ← current
Phase 1  Prerequisites (settings, Changesets/catalog de-risk, membership manifest, missing-changeset check)
Phase 2  Release-model cutover (Changesets in; release-please + per-commit npm + branch dance out)
Phase 3  Cross-repo contract proven on `edge` + cross-repo DAG enforcement
Phase 4  Repo split (back-edge cleanup → acyclic → git history extraction)   ← one-way door, human-gated
```

Ordering is load-bearing: Phase 1's npm floor is Tier 1 of the contract; Phase 2 must precede Phase 3; Phase 3 proves the contract on `edge` before the new repo exists; Phase 4 only starts once 1–3 are stable.

### Phase 1 — Prerequisites (low-risk, reversible) 🔄

1. ⬜ **Enable "require linear history" + merge queue on `main`** (repo settings; CI already handles `merge_group`). **Parked — privileged GitHub admin action (human).** Other human-gated one-way doors: retire the long-lived `production`/`staging`/`labs`/`dev` branches (back up tips first) after the first Changesets release proves the pipeline, and the Cloudflare-side deploy setup (see [App deploys](#app-deploys-) § Cloudflare-side setup).
2. ✅ **Generate the membership manifest** — `tools/toolbox/src/toolbox.ts::updateChangesets()` emits `.changeset/config.json` (the two fixed groups) from the workspace/project graph on `pnpm install`. Cross-checked against `scripts/check-publish-config.mjs` (non-private + `publishConfig.access: public`).
3. ✅ **De-risk Changesets × pnpm-catalog locally** (executed 2026-06-29; see findings below).
4. ✅ **`scripts/check-changeset.mjs`** (advisory; drives the `changeset-reminder` job in **Check**): detects PRs touching publishable source without a `.changeset/*.md` and posts a sticky reminder comment (never blocks); a change needing no release omits the changeset. Implements the [changeset authoring guide](../../agents/instructions/changesets.md).

**De-risk findings (executed locally on `0.9.0`, fully reverted — no registry).**

- ✅ The two `fixed` groups version **independently**: a Group B-only changeset bumps Group B and leaves Group A at `0.9.0` (core has no dependency on plugins).
- ✅ **Apps are never dragged into a publish**: a core bump ripples non-grouped apps (Composer, docs) to a plain `0.9.1` patch — they version but `tag: false` means no npm publish.
- ✅ **`workspace:*` and `catalog:` rewrite to concrete versions** in the packed tarball (`pnpm pack` on `@dxos/log`: `@dxos/node-std` → `0.9.0`, `chalk` → `^4.1.2`); **no `workspace:` / `catalog:` tokens leak**. Removing `@dxos/*` from the catalog (keeping `@dxos/wa-sqlite`) means every internal edge is `workspace:*`.
- ✅ **`0.x` minor→`1.0.0` cascade — found and fixed.** A `minor` on a `0.x` fixed-group member *used to* escalate the whole group to `1.0.0`: a peerDependency declared `workspace:*` (which pnpm pins to the exact version) reads as out-of-range on any bump, and Changesets force-escalates an out-of-range peer-dependent to `major`, which the fixed group then propagates. Fixed by three things together: (1) `peerDependencies` → `workspace:^` (regular deps stay `workspace:*`); (2) `onlyUpdatePeerDependentsWhenOutOfRange: true`; (3) a local patch of `@changesets/assemble-release-plan` (`patches/`) that escalates a `0.x` out-of-range peer-dependent to `minor`, not `major`. Result — standard semver at every version: `minor → 0.10.0` at `0.x`, `→ 1.3.0` post-1.0, breaking → `major`; verified against the real package graph.

  **The flag (2) and the patch (3) are independent code paths covering *different version regimes* — both are needed; neither depends on the other.** In `assemble-release-plan`, the flag is an argument to `shouldBumpMajor()` (decides *whether* a peer-dependent is force-bumped — only when out of range); the patch edits the line *inside* the branch that function guards (decides the bump *type*, `major` → `0.x ? minor : major`). So:
  - **Pre-1.0** — `^0.9` *excludes* `0.10`, so a `minor` is out of range → `shouldBumpMajor` is true regardless of the flag → the patched branch runs → `minor`, not `1.0.0`. **The patch does the work; the flag is inert here.**
  - **≥1.0** — `^1.2` *includes* `1.3`, so a `minor` is in range → the flag makes `shouldBumpMajor` false → the dependent isn't force-bumped at all. **The flag does the work; the patch's branch is never reached.** Without the flag the cascade would reappear at 1.x (dependents → `2.0.0` on every minor).

  **Maintenance.** The flag lives under `___experimentalUnsafeOptions_WILL_CHANGE_IN_PATCH` (an upstream escape hatch for options not yet in the stable schema — it can be renamed/removed in any Changesets patch). The patch targets the CommonJS build (`dist/*.cjs.js`) that `@changesets/cli` loads; the `.esm.js` copy is intentionally left unpatched (the CLI never loads it). After a `@changesets/*` upgrade, re-verify: pnpm fails loudly on install if the patch no longer applies, and `@changesets/cli` should symlink to the `_patch_hash=…` variant of `@changesets/assemble-release-plan` in `node_modules/.pnpm` whose `dist/*.cjs.js` carries the `// DXOS patch` comment (the plain, un-suffixed copy staying unpatched is expected).

  The **authoring** rules (what bump level to pick) live in the [authoring guide](../../agents/instructions/changesets.md); this mechanism is deliberately kept out of it.

Exit: ✅ membership generator + advisory changeset reminder landed (wired into **Check**); ✅ local `changeset version` + pack inspection clean. ⬜ merge queue + linear history (parked, privileged). The end-to-end publish is gated in Phase 2 by a real pre-release.

### Phase 2 — Release-model cutover (single repo) ⬜

- New: `.changeset/config.json` (generated); the Changesets publisher lives in `.github/workflows/publish-all.yml` — kept in that filename because npm's OIDC trusted publisher is bound to it, and the **trigger selects the channel**: push to `main` runs `changesets/action@v1` (Version PR → `@latest`, npm OIDC + `--provenance`); a `workflow_dispatch` cuts a `@next` snapshot (`changeset version --snapshot next` + `sync-versions` + `changeset publish --tag next --no-git-tag` — no branch / `pre` mode, see Section 6). `deploy-apps.yml` (app deploy, version-decoupled); `scripts/sync-versions.mjs`; `docs/RELEASING.md` (documents which trigger to use — merge the Version PR for `@latest`, manually dispatch Publish for `@next` — not commands to type). Root `package.json`: `changeset`, `changeset:version`, `changeset:publish` scripts (invoked **by the workflow**, not by hand).
- Toolbox: replace `updateReleasePlease()` with `updateChangesets()` (typed `ProjectGraph`, no casts); CI asserts the config is in sync.
- Validate the real pipeline by publishing a **`@next` snapshot** (manually dispatch `publish-all.yml`) and consuming it from a scratch install / the `edge` repo — this is the end-to-end proof (publish + install + dist-tag) that replaces the old Verdaccio dry-run.
- ✅ Deleted (in this cutover PR): `release-please-config.json`, `.release-please-manifest.json`, `release-please.yml`, `release-candidate.yml`, the per-branch npm path of `publish-all.yml` (its body is now the Changesets publisher), `scripts/{publish,deploy-apps,apps,bundle-apps}.sh`, `scripts/bump-version.js`, and the `{x-release-please-version}` markers. **Kept** `validate-pr-title.yaml` (PR-title convention, not release-please-specific).
- Agent instructions cutover: `check-changeset.mjs` is wired into **Check** as the advisory `changeset-reminder` job. Still pending: promote [`agents/instructions/changesets.md`](../../agents/instructions/changesets.md) into the core `CLAUDE.md` (the "add a changeset when a change should ship in a release" rule). `validate-pr-title.yaml` is kept (PR-title convention).
- Keep: `pkg-pr-new.yml`, `preview.yml`, `preview-deploy.yml`. Retire long-lived branches last (back up tips first).
- Cutover from `0.9.0`: both groups continue from `0.9.0`; Group B (plugins + cli) diverges from Group A on its first changeset; **standard semver** applies (the `0.x` minor→`1.0.0` cascade is fixed — see the de-risk finding) — at `0.x` breaking rides the `minor`, and `major` is the deliberate `1.0.0` cut.

Exit: a real release ships via the Version-Packages PR (Group A lockstep + Group B on its own diverged line); a deliberate `@next` snapshot published and installed; `Check` green; long-lived branches retired.

### Phase 3 — Cross-repo contract (proven on `edge`) ⬜

1. Generalize `link-packages.mjs` into `dxos` (today only in `edge/scripts/`); forbid its `--commit` path in CI; point `edge-tests.yml` at the dxos-owned copy.
2. Tier-2 bot: bumps SHA-pinned pkg.pr.new URLs in the consumer.
3. A "no local overrides" shared CI guard (`scripts/check-no-local-overrides.mjs`, to be added when `edge` lands — removed as unused for now); pilot in `edge`.
4. Cross-repo DAG enforcement (Section 8.7): generate the package → repo ownership map; add `check-package-cycles.mjs --cross-repo` (union dxos+edge graphs via the `edge-tests.yml` dual-checkout) as a required PR check + scheduled job; add the layer-direction lint; wire the release-toposort backstop.
5. Per-tier runbooks in `docs/` (the tier guide is §7 above).

Exit: `edge-tests.yml` green on the relocated script; a Tier-2 bump PR green on edge; the override guard fails a committed `file:` override; the cross-repo cycle check runs in CI.

### Phase 4 — Repo split (design-level; only after 1–3 stable; one-way door) ⬜

Repo A (`dxos`): `core/*`, `sdk/*` minus `app-*`, `common/*`, `reflect/introspect*`, non-UI `experimental/*`, `devtools/vscode-extension`, `tools/*`, `vendor/*`.

Repo B (`composer`): `ui/*`, `plugins/*`, `sdk/{app-framework,app-toolkit,app-graph,app-solid,shell,examples}`, `@dxos/cli` + `cli-util`, `@dxos/devtools` + `devtools-extension`, `storybook-utils`, `stories/*`, `apps/*`, `tools/storybook-*`.

The `sdk/app-*` packages and `shell` are the plugin-SDK layer, not storybook back-edges — moving them collapses most of the cut. Genuine remaining back-edges to clean first:

| Back-edge | Fix |
| --- | --- |
| `@dxos/schema`, `@dxos/types` — react-ui *devDep* for demo stories | Delete/inline the story; drop the devDep |
| `@dxos/react-client` — react-ui `ErrorBoundary` in a test decorator | Swap to `@dxos/react-error-boundary` (Repo-A common) |
| `@dxos/keyboard` — story-only | Move story to Repo B `stories-ui` |
| `@dxos/storybook-utils` — react-ui *peerDep* | Move to Repo B |
| `assistant-e2e`/`assistant-evals` (private); `assistant-toolkit` (public, plugin imports in `*.test.ts` only) | Move e2e/evals + the toolkit's plugin tests to Repo B |
| `@dxos/blade-runner` — `@dxos/plugin-script` | Default to Repo B (or sever the dep) |

Sequence (CI green throughout): (1) cleanup PR in Repo A removing back-edges (verification gate); (2) `check-cycles.mjs` + `check-package-cycles.mjs` confirm acyclic; (3) tag `pre-split`; (4) `git filter-repo` the Repo-B path set into the new repo + bootstrap its workspace, generated catalog subset, `.moon`, CI, Changesets, and `link-packages.mjs`; (5) delete moved dirs from Repo A (update globs, tsconfig paths, the `app-framework` `DEFAULT_PACKAGES` allowlist); (6) publish Repo A `0.10.0`; Repo B switches its catalog floor from a pkg.pr.new SHA to an npm range. No compat shims or re-export stubs. Confirm the duplicate `reflect/introspect*` vs `core/compute/introspect*` and delete the non-canonical one.

## 10. Risks / one-way doors

- **Changesets × pnpm catalog** — the highest tooling unknown; de-risked in Phase 1 via local `pnpm pack` inspection and in Phase 2 via a real pre-release; fallback is removing `@dxos/*` from the catalog.
- **One-way doors** — any real npm publish (`@latest`), branch deletion (back up tips), and the Phase-4 history extraction (tag `pre-split`).
- **Mid-flight publish gap** — overlap old and new publishing for one release; announce that continuous code now comes from pkg.pr.new, not the `@main` dist-tag.
- **Cross-repo diamond / version skew** — created by splitting; mitigated per Section 8.6.

## Appendix A — what Effect does (v3 vs v4)

Verified against their live configs.

| Dimension | v3 `Effect-TS/effect` | v4 `effect-smol` |
| --- | --- | --- |
| Tool | Changesets + `changesets/action@v1` | same, simpler config |
| Grouping | Independent (no `fixed`; cohesion via `updateInternalDependencies: "patch"`) | **Fixed** `[["effect","@effect/*"]]` |
| Branches | `main` + `next-minor` + `next-major` + custom merge queue | **`main` only** (see caveat) |
| Pre-release | long-lived `next-*` branches | **Changesets snapshot releases**, `tag: next` |
| Canary | pkg.pr.new | pkg.pr.new |
| Agent path | drop a `.changeset/*.md` | same |

DXOS targets the v4 shape plus **two `fixed` groups** (core/SDK, and plugins+CLI). Apps deploy and never publish.

**Caveat — don't over-read v4's single-track.** v4's `main`-only topology is a **transient pre-release state**: the entire v4 line is in `pre` mode publishing to `@beta` (`4.0.0-beta.N`) while v3 still ships `@latest` from its own `main`. The *deliberate, durable* v4 change is the **version-lock (`fixed` group)** for easier compatibility (confirmed in `effect-smol`'s `.changeset/config.json`: `"fixed": [["effect","@effect/*"]]`); the single-track topology is incidental and Effect's steady-state (v3) is multi-track. DXOS adopts the durable part (the fixed group + trunk) now and leaves the [additive hooks](#additional-release-tracks-future--kept-additive) to add tracks post-1.0 — it is not betting that single-track is permanent.
