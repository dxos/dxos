# Release & Change Management

The design of DXOS release and change management: how packages are versioned and published, how apps deploy, and how a future downstream repo will consume unreleased core. Sections 1–5 describe the system as built; [§6 Future plan](#6-future-plan) covers what is designed but not yet implemented. The runbook — which button to press — is the [Releasing](../REPOSITORY_GUIDE.md#releasing) section of the repository guide; changeset authoring is [`agents/instructions/changesets.md`](../agents/instructions/changesets.md). This spec is the _why_.

## 1. Goals

Optimize for **stability, less process, more flexibility, agent-followability**:

1. A file-drop change flow (Changesets) an agent can follow — no commit-message grammar to satisfy.
2. Version **core/SDK** as one lockstep group and **plugins + CLI** as a second; **apps deploy, never publish**.
3. A **pre-release** path that is deliberate and human-gated, not per-commit noise.
4. A **linear git history** (squash-only + require-linear-history).
5. Support a future downstream repo (`ui`/`plugins`/`cli`/`composer`) that develops against **unreleased** `dxos` core through a well-defined cross-repo contract with a dependency-cycle policy (see [§6](#6-future-plan)).

## 2. Versioning policy

Two fixed/lockstep groups plus deploy-only apps:

- **Group A — Core/SDK** — core + common + sdk + ui + devtools + reflect on one shared line (currently `0.9.x`), published to npm. A few private members (e.g. the storybook helper libraries) are versioned on this line but not published (`tag: false`).
- **Group B — Plugins + CLI** — every `@dxos/plugin-*` + `@dxos/cli` on a second line, published under it.
- **Apps** — every `private` app (composer-app/crx/dxos-org, docs, todomvc, tasks, testbench, and the storybook apps `storybook-react`/`-lit`/`-solid`) deploys and never publishes. They are **not in Changesets** (`ignore`d): Composer is versioned by its deploy release (§5), the rest are unversioned.

**Independent numbers, coupled timing.** The groups carry independent version lines (a Group B-only changeset bumps B alone) but share **one** "Version Packages" PR — merging it drains all pending changesets. Independent release _cadence_ comes later, when plugins move to their own repo with their own trunk + Version PR (§6), not via per-group release branches.

**Deploy ≠ publish — why Composer isn't in a publish group.** If it were, cutting a Composer build would publish all 81 plugins, and those plugins pin core versions that may not be released yet. So Composer versions on its own private line, and app deploys (`deploy-apps.yml`) are fully decoupled from the Changesets publish pipeline. This is a hard requirement: deploying an app must never publish a package.

**Membership is generated.** `fixed` matches package _names_, which share no common prefix — so each group is an enumerated list built from the pnpm project graph by `updateChangesets()` (not a filesystem scan, which would sweep in `@fixture/*` test fixtures). It regenerates on local `pnpm install` (`postinstall`, skipped in CI) and is committed; the **Check** workflow's `check-publish-config` step independently verifies every group member is publishable. Only Group B is a clean glob (`@dxos/plugin-*`). Membership shifts with a one-line generator change when the repo splits (§6).

**Catalog.** The catalog's `@dxos/*` self-references (`@dxos/client`, `@dxos/echo`, `@dxos/wa-sqlite`) violate the "in-repo deps must be `workspace:*`" rule. Removing them makes every internal edge `workspace:*` (Changesets-native) and avoids the maturing `--enable-pnpm-catalog` flag. (`workspace:` / `catalog:` tokens rewrite to concrete versions at pack time — none leak into a published tarball.) `@dxos/wa-sqlite` is assessed separately (may be a genuine external publish).

## 3. Tooling — Changesets

`.changeset/config.json` is **generated** by the toolbox (`updateChangesets()`) from the workspace/project graph on `pnpm install` — that file is the source of truth. The non-default settings that carry design intent:

- **`fixed`** — the two enumerated lockstep groups (A: core/SDK; B: `@dxos/plugin-*` + `@dxos/cli`), regenerated from the graph. `fixed` (not `linked`) because it bumps and publishes all members together every release; `linked` would only sync packages that changed — not what the core/SDK surface wants.
- **`privatePackages: { version: true, tag: false }`** — version private group members (storybook, Composer) but never tag or publish them; deploy-only apps get no changeset, so never bump.
- **`snapshot`** — the `@next` template (calculated base version + commit suffix, e.g. `0.10.0-next-<commit>`).
- **`bumpVersionsWithWorkspaceProtocolOnly`** — only workspace-protocol ranges drive dependent bumps; pnpm rewrites them at pack time.
- **`format: "oxfmt"`** — pinned rather than left on Changesets' `auto` formatter detection, so a generated `CHANGELOG.md` matches what **Check**'s `oxfmt --check` expects.
- Otherwise standard: `@changesets/changelog-git` (git-based, not GitHub API-based — `changelog-github` batches a GraphQL lookup across every unreleased changeset's commit in one query, which reliably timed out once the backlog grew past a few dozen changesets), `access: public`, `baseBranch: main`, `updateInternalDependencies: patch`.

**Standard semver at every version.** At `0.x`, breaking rides the **minor** (`0.9.0 → 0.10.0`) and `major` is reserved for the deliberate `1.0.0` cut. A `minor` does **not** cascade the group to `1.0.0`. Bump-level rules live in the [authoring guide](../agents/instructions/changesets.md).

**`major` is gated in CI while pre-1.0.** `scripts/check-changesets.mjs` (the `Check changesets` step) fails the build on any `major` in `.changeset/*.md`. The groups are `fixed`, so one stray `major` versions every package to `1.0.0` in a single release, and nothing surfaces it until `changeset version` runs on `main`. The rule no-ops once both group anchors leave `0.x`; **delete its section of that script as part of the PR that cuts `1.0.0`**, which needs the very `major` it rejects — the script's other rules outlive 1.0.0.

A dependent of a changed package takes a `patch`, peer-dependents included, so nothing in a `0.x` release escalates a group member past the level its changeset asked for. Intra-repo **`peerDependencies` use `workspace:^`** (caret), not `workspace:*`, so a published consumer resolving the group is not pinned to one exact version — see the `peerDependencies` non-negotiable in `AGENTS.md`.

**Agent ergonomics — the core win.** To record a release an agent writes one file, `.changeset/<slug>.md` (front-matter naming a package + bump level, then a changelog line) — no commit grammar, no interactive prompt, no history parsing. When and what to write is in the authoring guide. `scripts/check-changeset.mjs` is advisory — the **Check** workflow's `changeset-reminder` job posts a sticky comment when a publishable change has none, never blocking; `.changeset/` holds only real entries (no empty changesets). _How many_ is a gate: `check-changesets.mjs` (the `Check changesets` step) fails a PR adding more than one changeset, since a file per commit fragments one story across entries nobody can follow; the genuinely-two-stories PR waives it with a `# multiple-changesets: <reason>` front-matter comment, which the parser drops so it never reaches `CHANGELOG.md`. Counting is diff-based against the merge base and `pull_request`-only (the rule self-skips on other events): `.changeset/` holds every unreleased entry on `main`, and a `merge_group` batches PRs that each carry their own. That same step also rejects a changeset Changesets cannot version — an `ignore`d package named alongside a released one, or a name absent from the workspace — and reads front matter through `@changesets/parse`, the parser `changeset version` itself uses, so the gate cannot disagree with the release about what a file says.

**Version files.** `scripts/sync-versions.mjs`, run inside `changeset:version` and in every deploy/publish path, stamps `version.ts` (`DXOS_VERSION` — client packages from Group A, `@dxos/cli` from Group B) and `composer-app/src-tauri/tauri.conf.json` from each file's owning package version. A `--check` mode gates drift in **Check**.

## 4. Branch model — trunk on `main`

- A single long-lived `main`: squash-only PRs + "require linear history" ruleset + merge queue (CI handles `merge_group`). No long-lived release or environment branches. _(Enabling the ruleset + merge queue and deleting the old branches are privileged human actions — see §5 pending setup.)_
- Releases land as the squashed "Version Packages" PR plus a tag — no cross-branch merges.
- Pre-releases publish as `@next` **snapshot releases** — manually triggered, no `pre` mode, no long-lived branch.
- Apps deploy from `main` and tags, decoupled from package versions.

**Release lines are additive.** Pre-1.0 we run two channels — `main → @latest` and `@next` snapshots — and deliberately do not split `next-minor`/`next-major` lines or maintain an old major yet. Changesets keeps this additive: each track is just a branch + its own `--tag` + trigger, addable later with no rework. Triggers to add a line later: a consumer pins an old major needing patches; a breaking SDK rewrite must bake for months; or a minor and major mature at once. Footgun: never run `changeset pre enter` — it freezes all stable releases until `pre exit`; we use snapshots for `@next` instead.

## 5. Release execution — Action-driven, human-gated

All mechanics run in GitHub Actions; the human's only actions are **merging an auto-generated PR** and **clicking Run workflow** — never a local command sequence. Step-by-step is the [Releasing runbook](../REPOSITORY_GUIDE.md#releasing); this section is the design.

**Publishing lives in `publish-all.yml` for both channels** because npm's OIDC trusted publisher is bound to that workflow filename — so the **trigger selects the channel**:

- **`@latest`** — push to `main` maintains the "Version Packages" PR (consuming `.changeset/*.md`, bumping versions, writing changelogs); **merging that PR** triggers the publish (npm OIDC + `--provenance`) and the `@latest` group tags + releases.
  - **One tag and one GitHub Release per version group, not per package.** `scripts/release-groups.mjs` tags `v<version>` (Group A, continuing the pre-Changesets `v0.10.0` series) and `plugins-v<version>` (Group B), pushes both refs in a **single** `git push`, and creates one release per group whose body is the members' `CHANGELOG.md` entries deduped by changeset. This is not cosmetic: `changesets/action` pushes every tag `changeset publish` prints as its own `git push`, and GitHub's ref backend rejected ~139 of ~275 such back-to-back pushes with `remote: fatal error in commit_refs`, failing the job after npm had already published. Because both groups are `fixed`/lockstep, every per-package tag named the identical commit — one tag per group is the same information at 2 refs instead of ~275. Hence `publish: pnpm changeset:publish --no-git-tag` + `createGithubReleases: false`: the fan-out is suppressed at the source rather than retried. Do not reintroduce per-package tags to "restore" traceability — `v<version>` resolves to the same commit every one of them did.
  - **The tag/release step is gated on the commit subject, not the action's `published` output.** That output is scraped from `New tag:` lines in the publish log, so `--no-git-tag` pins it to `false` ([changesets/action#141](https://github.com/changesets/action/issues/141)); a `Version packages` commit on `main` is itself the release signal. `commitMode: github-api` is **not** an option here — it does not push tags for package names containing `/`, i.e. every `@dxos/*` package.
  - **The Version PR is owned by `GH_DXOS_BOT_PAT`, not `GITHUB_TOKEN`.** A `pull_request` run whose `opened`/`synchronize`/`reopened` came from `GITHUB_TOKEN` is created but parked in `action_required` — GitHub's recursion guard holds it for manual approval, so it never executes, the PR reports **zero** check runs, and it stays `blocked` until a human approves every run by hand. A PAT-owned PR runs Check unattended instead. Because `changesets/action` authenticates its pushes via a `~/.netrc` it writes from `github-token`, the checkout must also set `persist-credentials: false`: a persisted `http.extraheader` credential outranks netrc and would put the pushes back on `GITHUB_TOKEN`.
- **`@next`** — a `workflow_dispatch` runs `changeset version --snapshot next` + `sync-versions`, then `changeset publish --tag next --no-git-tag`. Versions are throwaway (`X.Y.Z-next-<commit>`); nothing is committed, no git tags, no-op when no changesets are pending — the version step is guarded on a pending `.changeset/*.md` because Changesets v3 makes `changeset version` exit 1 on an empty queue. No `pre` mode anywhere — `publish-all.yml` fails fast if a stray `.changeset/pre.json` appears.

Per-commit unreleased code is served by **pkg.pr.new** (§6 covers how a downstream repo consumes it), not npm.

### App deploys

The environment matrix and how-to are in the [runbook](../REPOSITORY_GUIDE.md#releasing); the design decisions:

- **One workflow, `deploy-apps.yml`.** Deployable apps are listed in `.github/workflows/scripts/apps.mjs`; everything else — Worker name, bundle task, output dir, target environments — derives from each app's committed `wrangler.jsonc` (no separate manifest). A `plan` job resolves the run into named booleans so downstream `if:`s stay readable.
- **Environment is a deploy parameter, not a git branch.** The app set follows the env (`preview` auto, daily, from `main`'s tip; `dev`/`preview`/`staging`/`production` by dispatch), with an optional `app` input to narrow to a single app (a hotfix).
- **`preview` and `dev` replace `main` and `labs`.** `preview` is a once-a-day snapshot of `main`'s tip against EDGE production — a stable, predictable bleeding edge for internal dogfooding, rather than a build per commit that nobody can name. `dev` is the as-needed environment for work that needs a hosted URL before it is preview-ready, pointed at EDGE preview so it cannot corrupt production data. `staging` is kept but deliberately unused; reintroduce a QA freeze there only if `preview` → `production` proves unstable.
- **`preview` titles one thing: the environment.** It is the daily dogfood deploy on `preview.composer.space`. Per-PR deploys are Cloudflare Worker preview versions of `env.dev`, so their internals and `--preview-alias` keep the word, but nothing outward-facing is titled with it — the workflows are `pr-build.yml`/`pr-deploy.yml`, named for their trigger.
- **Cloudflare Workers Static Assets** (Pages deprecated): `wrangler deploy --config <app>/wrangler.jsonc --env <env>`, one Worker per env (`production` = the bare name carrying the custom domain, others `<name>-<env>`). Composer isn't pure-static — its `_worker.js` (R2 feedback-logs, RSS + OTel proxies) is the Worker `main` with assets bound + `run_worker_first: ["/api/*"]`; the rest are assets-only.
- **Composer is the only versioned app.** A production deploy's `release` job bumps `composer-app`/`crx` by the dispatch `bump` input, commits to `main`, tags `composer-v<x>`, and the rest of the run builds + deploys that commit (web + desktop; iOS builds on `dev` alone). Docs/examples are unversioned and just deploy. Desktop/iOS run in `deploy-tauri.yaml` (CrabNebula). **Desktop builds on every environment** — a dogfood channel with no app to install is not a dogfood channel. **iOS builds on `dev` alone**, going to TestFlight: the app is not shipped, so the other environments have no release target to justify 90 minutes of macOS runner. Once it ships: preview + staging on their own TestFlight streams, production on the App Store.
- **Tracking what's deployed where:** per-app floating `<app>/<env>` git tags, force-updated each deploy (e.g. `git diff composer/staging..composer/production`). No GitHub Environments; the deliberate dispatch is the gate.
- **Build-sharing:** Composer's web bundle is built once by a `build-bundle` job and shared via artifact to the web + Tauri jobs (they skip rebuilding). Every environment does a full clean build — a stale/corrupt cache entry must never reach a user-facing deploy (reliability, not security).

**Pending human setup** (privileged, not agent-doable). Immediately after this lands — dispatch a `dev` and a `preview` deploy: PR previews upload versions against the `composer-dev` Worker and `wrangler versions upload` cannot create it, so previews fail until the first `dev` deploy exists. Before production is live — **Cloudflare:** give `CLOUDFLARE_API_TOKEN` **Workers Scripts: Edit**; per `composer-<env>` Worker create its R2 bucket + `SIGNOZ_INGESTION_KEY` secret; move the custom domains off the Pages projects onto the production Workers and attach `preview.composer.space` to `composer-preview` (deploy the Workers first, then switch — no gap); disable docs' Cloudflare git auto-build; retire the Pages projects and the `composer-main`/`composer-labs` Workers with their `main.composer.space`/`labs.composer.space` domains. **GitHub:** enable the require-linear-history ruleset + merge queue; delete the old long-lived branches once the pipeline is proven (back up tips first). `pr-deploy.yml` (per-PR previews) uploads preview versions of `composer-dev` (`pr-<n>-composer-dev.dxos.workers.dev`).

## 6. Future plan

Not yet implemented — relevant once `edge` integration or the repo split starts. Two related workstreams: a **cross-repo contract** for depending on unreleased code, then the eventual **repo split**.

### Cross-repo development

A downstream repo (`edge` today; the future `composer` repo) consumes **unreleased** `dxos` core through three tiers:

| Tier                 | Mechanism                                        | Use                                                        | Committed?                                  |
| -------------------- | ------------------------------------------------ | ---------------------------------------------------------- | ------------------------------------------- |
| **1 — Stable floor** | npm `@latest` (or deliberate `@next`)            | Default deps; what ships to users                          | yes (pinned range)                          |
| **2 — Continuous**   | pkg.pr.new SHA-pinned URL                        | Land on `main` against an upstream change not yet released | yes (re-pin to a release later; perishable) |
| **3 — Local dev**    | `link-packages.mjs` (tarball + `pnpm.overrides`) | Editing both repos at once on one machine                  | never (CI guard rejects `file:`)            |

Decision: editing two repos locally → Tier 3, unlink before committing; need `main` to build against an unreleased upstream change → Tier 2, re-pin to a real release when upstream releases (pkg.pr.new artifacts expire ~1–6 months); cutting/preparing a release → Tier 1. Enablement: generalize `link-packages.mjs` from `edge/scripts/` into `dxos` and forbid its `--commit` path in CI; add a Tier-2 bot that bumps SHA-pinned pkg.pr.new URLs; validate on `edge` (`edge-tests.yml`).

### Dependency & cycle policy

Grounded in industry practice (Rush subspaces, Go's import-cycle ban, _SWE at Google_ on diamond deps, Cargo publish semantics). Today `dxos`↔`edge` is one-way (`edge` → `dxos`, all-private), so no cycle exists yet.

1. **The global package graph (union of all repos) MUST be a DAG.** The unit is the published _package_, not the repo; no package may transitively depend on itself.
2. **Repo-level reference cycles are ALLOWED** — A may depend into B while B depends into A, provided no individual _package_ cycle exists. This lets repos keep coarse, natural boundaries.
3. **Package-level cycles are FORBIDDEN, even through published versions** — they forfeit atomic change and cause confusing version ripple. Break them by extracting shared definitions downward.
4. **Shared definitions go in a leaf contract/schema package** at the bottom of the stack (the proto/IDL pattern), depended on by both sides — never sideways. For DXOS that is `@dxos/protocols` / schema / `*-types`. Caveat: `@dxos/protocols` is _near_-leaf but not pure; a cross-repo contract package must be genuinely low-level (or carry its commons as leaves). _Worked example:_ moving schema into `edge`, publishing it, and having `dxos` core depend on it is fine — iff that package doesn't transitively depend back on `dxos` core.
5. **Committed cross-repo edges use pinned published versions only** (Tier 1/2); Tier 3 is dev-only.
6. **Contain the cross-repo diamond:** single-version policy for shared third-party deps + `peerDependencies` for shared contract packages + automated bumps (Renovate/Dependabot).
7. **Enforcement** — across repos there is no workspace, so the DAG must be enforced explicitly: **(a)** a generated package→repo ownership map + a `check-package-cycles.mjs --cross-repo` mode that unions every repo's `@dxos/*` edges (reusing `edge-tests.yml`'s dual-checkout) and fails on any multi-node SCC — a required PR check + scheduled drift job; **(b)** a cheap layer-direction lint (`contracts < core < edge/app`) failing on upward/sideways edges; **(c)** a release-toposort backstop that fails if a cycle slipped through.
8. **Bias toward not splitting** — per _SWE at Google_, prefer source-control problems over dependency-management ones; every cut edge is a versioning cost paid every release.

### Repo split

Only after the cross-repo contract is proven on `edge`. The history extraction is irreversible.

- **Repo A (`dxos`):** `core/*`, `sdk/*` minus `app-*`, `common/*`, `reflect/introspect*`, non-UI `experimental/*`, `devtools/vscode-extension`, `tools/*`, `vendor/*`.
- **Repo B (`composer`):** `ui/*`, `plugins/*`, `sdk/{app-framework,app-toolkit,app-graph,app-solid,shell,examples}`, `@dxos/cli` + `cli-util`, `@dxos/devtools` + `devtools-extension`, `storybook-utils`, `stories/*`, `apps/*`, `tools/storybook-*`.

The `sdk/app-*` packages + `shell` are the plugin-SDK layer (not storybook back-edges) — moving them collapses most of the cut. Genuine back-edges to clean first:

| Back-edge                                                                                                                  | Fix                                                               |
| -------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `@dxos/schema`, `@dxos/types` — react-ui _devDep_ for demo stories                                                         | Delete/inline the story; drop the devDep                          |
| `@dxos/react-client` — react-ui `ErrorBoundary` in a test decorator                                                        | Swap to `@dxos/react-error-boundary` (Repo-A common)              |
| `@dxos/keyboard` — story-only                                                                                              | Move story to Repo B `stories-ui`                                 |
| `@dxos/storybook-utils` — react-ui _peerDep_                                                                               | Move to Repo B                                                    |
| `assistant-e2e` (private, deprecated — legacy gated agent tests); `assistant-toolkit` (plugin imports in `*.test.ts` only) | Remove `assistant-e2e`; move the toolkit's plugin tests to Repo B |
| `@dxos/blade-runner` — `@dxos/plugin-script`                                                                               | Default to Repo B (or sever the dep)                              |

Sequence (CI green throughout): (1) cleanup PR in Repo A removing back-edges; (2) `check-cycles.mjs` + `check-package-cycles.mjs` confirm acyclic; (3) tag `pre-split`; (4) `git filter-repo` the Repo-B path set into the new repo + bootstrap its workspace / catalog subset / `.moon` / CI / Changesets / `link-packages.mjs`; (5) delete moved dirs from Repo A (globs, tsconfig paths, the `app-framework` `DEFAULT_PACKAGES` allowlist); (6) publish Repo A `0.10.0`; Repo B switches its catalog floor from a pkg.pr.new SHA to an npm range. No compat shims. Also resolve the duplicate `reflect/introspect*` vs `core/compute/introspect*`.
