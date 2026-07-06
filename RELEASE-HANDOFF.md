# Handoff — Release & Change-Management Redesign

**Purpose of this file:** hand this work to a fresh agent with no memory of the planning session. The **source of truth for the design** is [`docs/design/release-spec.md`](docs/design/release-spec.md); this file is the *meta-context* — status, decisions + rationale, verified repo facts, open questions, working norms, and what to do next. Read the spec first, then this.

> This is a scratch handoff (uncommitted). Relocate or delete it once the work is picked up.

---

## 1. Mission

Redesign DXOS release & change management for **more stability, less process, more flexibility, and agent-followability**. Concretely: drop release-please + conventional commits; version core/SDK together and plugins+CLI together (a second group); deploy apps (incl. Composer) with no npm publish; keep a staging/pre-release path; keep a clean linear git history; and lay groundwork for a future third repo (`ui`+`plugins`+`cli`+`composer`/apps) that develops against unreleased `dxos` core via a defined cross-repo contract + dependency-cycle policy.

## 2. Status (as of this handoff)

- **Phase 0 + Phase 1 complete; Phase 2 & Phase 3 code/config landed (2026-06-29).** What remains is the human-gated / one-way-door / `edge`-repo work, captured in [`docs/design/release-parked-steps.md`](docs/design/release-parked-steps.md).
- **Implemented & verified locally:** `@dxos/client`+`@dxos/echo` removed from the pnpm catalog (kept `wa-sqlite`); `@changesets/cli`+`changelog-github` in the catalog + root devDeps; `tools/toolbox/src/toolbox.ts::updateChangesets()` generating `.changeset/config.json` (two fixed groups, runs alongside `updateReleasePlease` during overlap); `scripts/check-changeset.mjs` (advisory), `scripts/sync-versions.mjs`, `scripts/check-no-local-overrides.mjs`, `scripts/check-cross-repo-cycles.mjs`; `.github/workflows/{release,release-next,deploy-apps}.yml`; root `changeset`/`changeset:version`/`changeset:publish` scripts; `docs/RELEASING.md`. **Four-environment deploy flow** (generic, app-manifest-driven): `deploy-manifest.json` + `scripts/deploy-env.mjs` + `deploy-apps.yml` — `dev` auto on `main`, `labs`/`staging` manual dispatch, `production` automatic only on a real release (gated, not manual). Environment = a deploy parameter (not a branch); current code per env tracked via **GitHub Environments**. **De-risk executed and reverted** (see spec Phase 1 findings) — key outcome: **pre-1.0 bump = `patch` only** (a `minor` on a `0.x` fixed-group member jumps to `1.0.0`).
- **Everything is UNCOMMITTED in the worktree.** No commit, no PR (standing preference — see §8).
- **NOT done (parked — see the parked-steps doc):** repo settings (linear history + merge queue), any real npm publish / `next` branch, deletion of release-please + per-commit-npm + PR-title gate (gated on a real release proving the pipeline), branch retirement, and the Phase 3 proof against the `edge` repo. **Phase 4 not started.**

**Worktree / branch (work here, nowhere else):**
- Worktree: `/Users/jdw/.ccmanager/dxos/hopeful-jennings-bd7969`
- Branch: `claude/hopeful-jennings-bd7969`
- Note: `/Users/jdw/Code/dxos` is a *separate clone on another branch* — read-only reference at most; do **not** edit there. Research agents reported paths under `/Users/jdw/Code/dxos`; translate them to the worktree.

**Files created/modified in Phase 0 (all uncommitted):**
- Created: `docs/design/release-spec.md` (canonical spec), `agents/instructions/cross-repo-development.md` (agent decision guide), `agents/instructions/changesets.md` (changeset authoring guide — activates Phase 2, promoted into `CLAUDE.md` then)
- Modified: `REPOSITORY_GUIDE.md` (added an "In transition" banner pointing at the spec), `docs/design/README.md` (indexed the spec under a "Process" section)
- Working plan (outside the repo): `/Users/jdw/.claude/plans/i-would-like-to-soft-chipmunk.md`

## 3. Locked decisions + rationale (do not relitigate)

All of these are the user's explicit choices, made after research. Rationale is included so you don't re-open them.

1. **Tool = Changesets** (`@changesets/cli` + `@changesets/changelog-github`). Replaces release-please + conventional commits. Chosen because it's the only mature tool expressing DXOS's exact hybrid (two fixed groups + ignored apps) in one config, is commit-message-agnostic, and is agent-friendly (drop a `.changeset/*.md` file).
2. **Versioning policy: two fixed PUBLISH groups; apps deploy, never publish.** **Group A** = core + common + sdk + ui + devtools + reflect (+ the three storybook apps, versioned-not-published) on one line from `0.9.0` (~150 pkgs). **Group B** = all `@dxos/plugin-*` (81) + `@dxos/cli` (82 pkgs); both publish to npm on a second line. Plugins are **no longer independently versioned**. **Deploy ≠ publish (hard requirement):** every `private: true` app deploys via `deploy-apps.yml` and **never** triggers an npm publish. **Composer is NOT in a publish group** — if it were, cutting a Composer build would publish all 81 plugins, which would pin core versions that may be unreleased (the hazard the user flagged). `composer-app`/`composer-crx` carry an **independent version line** (named in a changeset) for the desktop/extension build; `docs`/`todomvc`/`tasks`/`testbench` deploy off branch+SHA with no semver. (Revised 2026-06-29: Composer removed from Group B per the deploy-without-publish requirement.)
3. **Branch model = trunk on a single `main`** (squash-only + "require linear history" ruleset + merge queue). Retire `production`/`staging`/`labs`/`dev` long-lived branches, the `rc-*`/`hotfix-*` flow, and the `rc → production → main` `--no-ff` chain (the structural source of today's non-linear history).
4. **Pre-releases = Action-driven, human-gated, simple.** A **long-lived `next` branch** kept permanently in Changesets `pre` mode (`pre.json` committed, `tag: next`); **pushing to `next` triggers** `changeset version` + `publish --tag next` (the push *is* the human gate — no `workflow_dispatch` ceremony; prereleases are infrequent). `pre` mode never runs on `main`. **No per-commit npm publishing** (today's per-branch `X.Y.Z-<tag>.<sha>` publishing is removed). Pre-1.0 we stay single-track; defer `next-minor`/`next-major` split + old-major LTS until post-1.0 triggers fire.
5. **Releases = Action-driven.** `release.yml` on push to `main` maintains the Changesets "Version Packages" PR; merging it publishes `@latest` (npm OIDC + `--provenance`, preserve today's trusted publishing). No local `changeset`/`publish` commands ever.
6. **Cross-repo unreleased-code = three tiers.** Tier 1 = npm releases/pre-releases (stable floor, pinned). Tier 2 = **pkg.pr.new** SHA-pinned URLs (continuous; perishable; never a release pin). Tier 3 = `link-packages.mjs` tarball+`pnpm.overrides` (local dev only; CI guard rejects committed `file:`/`.local-pack`).
7. **Cross-repo dependency-cycle policy:** the global **package** graph must be a DAG; **repo-level reference cycles are allowed** (so we don't over-split into tiny packages); **package-level cycles forbidden** even through published versions; shared defs go in a **leaf contract/schema package**. Enforced (Phase 3) by a cross-repo union-graph check (reusing `edge-tests.yml` dual-checkout) + a layer-direction lint + the release toposort backstop.
8. **Apps decoupled from package versions.** Once apps move to the separate repo, branch-push triggers need not distinguish app-deploy vs package-publish.

## 4. Verified repo facts (established during planning — trust these, re-verify only if stale)

- ~400 packages, all **lockstep at `0.9.0`** (only private `@dxos/av` drifts to `0.8.3`).
- `release-please-config.json` is **~1,409 lines, auto-generated** on `pnpm install` (postinstall) by `tools/toolbox/src/toolbox.ts::updateReleasePlease()` (`tools/toolbox/src/main.ts` calls it). It stamps `$.version` into every `package.json` + three `version.ts` (`@dxos/client`, `@dxos/client-services`, `@dxos/cli`) + `composer-app/src-tauri/tauri.conf.json`. **This generator must be replaced**, not just the config file.
- Conventional-commit PR titles enforced by `.github/workflows/validate-pr-title.yaml` (`amannn/action-semantic-pull-request`).
- Continuous publish today: `.github/workflows/publish-all.yml` + `scripts/publish.sh` (dist-tag map production→latest, staging→next, main→main, labs→labs) + `scripts/bump-version.js` (`X.Y.Z-<tag>.<sha>`). **pkg.pr.new** via `.github/workflows/pkg-pr-new.yml` on push to `main`. Composer previews via `preview.yml` + `preview-deploy.yml`.
- **Apps deploy off branch+SHA, not versions.** `.github/workflows/scripts/deploy-apps.sh` runs `wrangler pages deploy out/<app> --branch "$BRANCH"` (Cloudflare Pages); source maps tag `$GITHUB_SHA`. The only app artifact with a real semver version is the Composer **desktop (Tauri)** build (`packages/apps/composer-app/src-tauri/tauri.conf.json`, today `0.9.0`, stamped by release-please `extra-files`). `apps.sh` currently auto-deploys only `composer-app` + `storybook-react`. ⇒ deploy is decoupled from publish; Composer's Tauri version comes from `composer-app`'s own independent version line (Composer is not in a publish group).
- The pnpm **catalog carries `@dxos/*` self-references** (`@dxos/client: ^0.8.3`, `@dxos/echo: ^0.8.3`, `@dxos/wa-sqlite: ^0.2.1` in `pnpm-workspace.yaml`) — these **violate** the repo's own "in-repo deps must be `workspace:*`" rule. Removing them is recommended and sidesteps the immature `--enable-pnpm-catalog` flag (the #1 tooling unknown).
- `scripts/check-cycles.mjs` (madge, file-level) and `scripts/check-package-cycles.mjs` (package-level, intra-repo, currently reports no cycles across ~253 pkgs) both exist — the acyclicity gates for the split are real.
- **`edge`↔`dxos` is effectively one-way today** (`edge` → `dxos`; `edge` is all-private, no npm publish, consumes `dxos` via `catalog:dxos` + a `link-packages.mjs` that lives in `edge/scripts/`). No package cycle exists yet.
- **`.changeset/` does not exist** — greenfield for Changesets.
- **Repo-split back-edge inventory** (for Phase 4): the `sdk/app-*` packages + `shell` are the *plugin-SDK layer* (move to the new repo, which collapses most of the cut). The genuine remaining back-edges to clean first are small: `@dxos/schema`, `@dxos/types` (react-ui devDep for demo stories), `@dxos/react-client` (react-ui `ErrorBoundary` in a test decorator → swap to `@dxos/react-error-boundary`), `@dxos/keyboard` (story-only), `@dxos/storybook-utils` (react-ui peerDep → move), `assistant-e2e`/`assistant-evals` + `assistant-toolkit`'s plugin-importing tests, `@dxos/blade-runner` (`@dxos/plugin-script`). Also resolve the duplicate `reflect/introspect*` vs `core/compute/introspect*`.

## 5. Research backing (so you don't redo it)

Three research workflows informed the decisions; headline findings (full design captured in the spec):
- **Effect v3 vs v4:** v3 = Changesets + independent versioning + 3 long-lived release branches (`main`/`next-minor`/`next-major`) + a bespoke merge-queue action. v4 (`effect-smol`) = **fixed group** `"fixed": [["effect","@effect/*"]]` + single-track `main` + `pre` mode. **Caveat (important):** v4's single-track is a *transient pre-release artifact* (the whole v4 line is in `pre` mode on `@beta`); the *deliberate, durable* v4 change is the version-lock. Don't read single-track as permanent — Effect's steady state (v3) is multi-track.
- **Multi-track on Changesets:** Changesets has **no native multi-track feature**; every track = a branch + its own config/`baseBranch` + its own `--tag` + its own trigger. Patterns: short-lived `release/*` + pre mode (Apollo); long-lived `next` branch with committed `pre.json` (XState — the template DXOS adopted, simplified to push-trigger); old-major LTS via a `vN` branch with diverged `.changeset/config.json` + `@latest-1`/`lts`; the Effect-v3 train. **Never enter `pre` on `main`** (freezes all stable releases).
- **Broad ecosystem survey (~20 projects):** the field converged on Actions-driven publish but split on (a) trigger and (b) version intent. DXOS sits in the **Changesets / Version-PR / trunk** cluster; its closest analog is **Biome** (Changesets + fixed group + polyglot). Its one distinctive move — **two** fixed groups (core/SDK and plugins+CLI) in one repo — is uncommon but justified by the core-plus-plugins shape and is exactly Changesets' `fixed` use case. Notable: the Vite ecosystem mostly does *not* use Changesets (antfu `bumpp`+`changelogithub`, tag-driven, lockstep); DXOS deliberately sided with Astro/Biome against that grain because it needs two independently-moving version lines (core/SDK vs plugins+CLI), which a single tag-driven lockstep flow can't express.

(Raw research outputs lived in workflow task transcripts under `~/.claude/projects/.../tasks/` and may not persist; the spec captures the conclusions.)

## 6. Open sub-decisions (need user sign-off before Phase 1 builds them)

1. **Group membership — RESOLVED (2026-06-29).** Two fixed PUBLISH groups: **A** = core/common/sdk/ui/devtools/reflect + storybook; **B** = all plugins + `@dxos/cli`. Composer and all other apps are **not** in a publish group — they deploy, never publish (composer-app/crx on their own version line). (Spec §3.) Build the manifest from the **pnpm workspace/project graph** (not a filesystem scan) and exclude non-`@dxos/*` test fixtures (`@fixture/pkg-b` under `src/__fixtures__/`).
2. **Remove `@dxos/*` self-refs from the pnpm catalog?** Recommended yes (aligns with existing rule, sidesteps the catalog flag). Assess `@dxos/wa-sqlite` individually. (Still open.)
3. **`@dxos/cli` version — RESOLVED (2026-06-29):** CLI joins **Group B** (Plugins + CLI), so `dx --version` tracks the plugins line — no separate `version.ts`-tracking step needed.

## 7. What to do next (Phase 1 — only on explicit go-ahead)

Phase 1 is low-risk prerequisites (reversible, no cutover):
1. Enable "require linear history" + merge queue on `main` (repo settings; CI already handles `merge_group`).
2. Generate the fixed-group membership manifest from the workspace graph; cross-check vs the private-package set and `scripts/check-publish-config.mjs`.
3. **De-risk Changesets × pnpm-catalog locally (no registry):** on a scratch branch, `changeset version` + `pnpm pack`/`pnpm publish --dry-run`, then inspect tarballs — assert Group A bumps together while Group B (plugins + cli) bumps on its own separate line, no `workspace:`/`catalog:` tokens leak, and `version.ts` stamping works. **Note:** Verdaccio was considered and rejected — the end-to-end publish/install gate happens in Phase 2 via a real `@next` pre-release instead. Fallback if catalog rewriting misbehaves: remove `@dxos/*` from the catalog.
4. Write `scripts/check-changeset.mjs` (advisory first): require a `.changeset/*.md` on PRs touching publishable source; allow an explicit empty changeset; auto-pass private/app/CI/docs-only PRs. It enforces `agents/instructions/changesets.md` (the authoring guide). At Phase 2 it becomes blocking and the guide is promoted into `CLAUDE.md`, replacing the conventional-commit PR-title gate.

Phases 2–4 are detailed in the spec (§9): Phase 2 = release-model cutover (replace `updateReleasePlease()` with `updateChangesets()` in `tools/toolbox/src/toolbox.ts`, add `release.yml`/`release-next.yml`/`deploy-apps.yml`/`scripts/sync-versions.mjs`, delete release-please + per-commit-npm + the PR-title gate **after** a real release proves the new pipeline — overlap, don't gap); Phase 3 = formalize the cross-repo contract on `edge` + cross-repo DAG enforcement; Phase 4 = the repo split (one-way door, human-gated). **Phases are ordered; the ordering is load-bearing.**

## 8. Working norms (user preferences — follow these)

- **Do not commit/push/open a PR unless explicitly asked.** "Continue" means keep working the plan, not submit.
- **Releases/pre-releases must be GitHub-Actions-driven** (no local `changeset`/`publish`); the human gate is a deliberate git action (merge the Version PR for `@latest`; push the `next` branch for `@next`).
- **Work in the assigned worktree only** (`/Users/jdw/.ccmanager/dxos/hopeful-jennings-bd7969`); never edit the `/Users/jdw/Code/dxos` clone or create side worktrees.
- **No casts to fix types** (`as any`/`as T`/non-null `!`); fix at the source. `as const` is fine. Audit diffs for new casts before committing.
- **No compat re-export shims** when moving code — update all call sites in the same change.
- Run **oxfmt** on changed files before committing; CI "Check" = build + test + lint + fmt (one workflow). After any push, check `gh run list --branch <branch> --workflow "Check"`.
- When asking the user questions, make them yes/no or numbered options.
- Update existing PR comments/descriptions rather than posting new ones.

## 9. Pointers

- Canonical design: `docs/design/release-spec.md` (status-tagged ✅/🔄/⬜).
- **Parked human-gated/one-way-door steps: `docs/design/release-parked-steps.md`** (what's left to do, in order).
- Release runbook (which button to press): `docs/RELEASING.md`.
- Agent cross-repo guide: `agents/instructions/cross-repo-development.md`.
- Agent changeset authoring guide: `agents/instructions/changesets.md` (when to write a changeset + what to include; activates Phase 2, promoted into `CLAUDE.md`).
- Implemented scripts: `scripts/{check-changeset,sync-versions,check-no-local-overrides,check-cross-repo-cycles}.mjs`; generator in `tools/toolbox/src/toolbox.ts::updateChangesets()`; workflows `.github/workflows/{release,release-next,deploy-apps}.yml`.
- Working plan: `/Users/jdw/.claude/plans/i-would-like-to-soft-chipmunk.md`.
- Key files to touch in Phases 1–2: `tools/toolbox/src/toolbox.ts` + `main.ts`; `.github/workflows/{publish-all,release-please,release-candidate,validate-pr-title,check,pkg-pr-new,edge-tests}.yml` + `scripts/{bump-version.js,publish.sh}`; `pnpm-workspace.yaml`; `release-please-config.json` + `.release-please-manifest.json` (delete); `scripts/{check-cycles,check-package-cycles,check-publish-config}.mjs`; `edge/scripts/link-packages.mjs`; `packages/sdk/app-framework/src/vite-plugin/packages.ts`.
