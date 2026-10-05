# CI — Tasks

_Resume — two streams, two PRs._

_**Cache** (branch `claude/depot-vs-self-hosted-cache-3fbd62`, PR #12494 draft) — watch Check, then mark ready. The moon remote cache is a self-hosted `bazel-remote` at `cache.dxos.network` (DO NYC3) behind mTLS, and it is now **measured in CI**: a fully-cached 324-task `:build` takes **14 s against 161 s uncached** on a Depot runner, hydrating 324/324 in 13.6 s at 31 ms per task over a 7 ms link. Runners were compared and Depot stays: compute is identical and it sits closest to the cache. Evidence in [`REPORT.md`](./REPORT.md), runbook in [`tools/moon-cache/`](../../../tools/moon-cache/README.md)._

_**E2E** (branch `claude/e2e-test-performance-uf9hq7`, PR #12482, ready for review) — causes B and C are fixed, cause A is root-caused to the production edge and blocked on **DX-1152** (Mykola), cause D needs a CI trace. The open decision is the user's: hold the PR on production edge, point e2e at a dedicated/staging edge tier (recommended), or quarantine the two-peer tests. Phase 3 below is the ledger._

Context and the failure mode that governs this area: [`DESIGN.md`](./DESIGN.md).

## Phase 1: Adopt the self-hosted cache

Committed, verified from a dev machine, and now measured on a Depot runner via PR #12494 — see
REPORT.md, "In CI". What remains is operational hardening, not the rollout itself.

- [x] **Provision and harden the cache** — `bazel-remote` v2.5.0 on `s-4vcpu-8gb` NYC3,
      systemd, zstd, 100 GB LRU, mTLS via a private CA. Verified 401 without a client
      certificate on both reads and writes; `/status` stays open for health checks.
- [x] **Point moon at it** — `.moon/workspace.yml`; the Depot cache config and every
      `DEPOT_TOKEN` env entry are removed, so rollback is a revert rather than an edit.
- [x] **Materialise certificates in CI** — `.github/actions/setup` writes them from three
      `MOON_CACHE_*` environment variables, bound once per workflow rather than at every call
      site (a composite action cannot read the `secrets` context). It **fails** when they are
      absent, except on fork PRs.
- [x] **Guard against silent degradation** — the setup action probes the cache for reachability
      and client-certificate acceptance before any task runs, and fails the job if either is
      wrong. Connectivity rather than a hit count: a legitimately cold branch has zero hits, so a
      hit count cannot tell "nothing to restore" from "cache is broken".
- [x] **Document operations and local setup** — [`tools/moon-cache/`](../../../tools/moon-cache/README.md),
      including `install-certs.sh --op`.
- [x] **Store the certificates** — one `moon-cache-certs` item in the 1Password `CI` vault, each
      file its own concealed field; `install-certs.sh --op` reads the three client files from it.
      `ca.key` is in the item but never fetched by that path.
- [x] **Install once per machine, not per worktree** — certificates live in
      `~/.config/dxos/moon-cache` and are found via `MOON_REMOTE_MTLS_*`, which take absolute
      paths. The in-repo `.moon/certs` layout would have needed repeating in every checkout, and a
      machine here has twenty-three. CI keeps the in-repo layout via `--worktree`, since a runner
      has one.
- [x] **Set the three `MOON_CACHE_*` repository secrets** on `dxos/dxos`.
- [x] **Measure the cache in CI** — 14 s cached against 161 s uncached on a Depot runner,
      324/324 hits, mTLS working from inside the job container. REPORT.md, "In CI".
- [x] **Open the PR** — https://github.com/dxos/dxos/pull/12494 (draft).
- [x] **DNS `cache.dxos.network` → the droplet** — A record, DNS-only (the Cloudflare proxy does
      not pass gRPC on 9092). `.moon/workspace.yml` now uses the name; verified 12/12 hits over it.
- [ ] **Reserve the droplet IP.** Now that clients dial the name, a rebuild costs a DNS edit
      rather than a config change — but it still invalidates the certificate's IP SAN, and a
      reserved IP removes both.
- [ ] **Monitoring** on `:9093/metrics` — disk against the 100 GB bound, liveness on `/status`.
      A dead cache is invisible: CI just gets slow.
- [ ] **Read-only certificates for developers.** Any client with a certificate can write and
      `bazel-remote` has no per-client ACL, so a laptop can poison CI's cache today.
- [ ] **Cancel the Depot cache subscription** once this has a track record. Depot remains the
      runner provider (`depot-ubuntu-24.04-8`); only the cache moved. Reconsider the timeline:
      Depot fixed the blob-batching bug behind their slowness. Retested on an actual Depot runner,
      self-hosted is now 2.1–4.4× faster (was ~11×), not the order of magnitude the original
      decision rested on — see REPORT.md, "Depot re-measured after their blob-batching fix".

## Phase 2: Backlog

- [x] **Resolve the affected scope once per job** — `.depot/actions/affected` +
      its `resolve-affected.mjs` export `MOON_AFFECTED`/`MOON_BASE` from the trigger's own base
      (`pull_request.base.sha`, `merge_group.base_sha`, else the merge-base with `origin/main`), so
      every moon step is unconditional. Collapsed 11 branch-gated step variants to 4, retired
      `.depot/actions/branch`, and made the decision reproducible off CI —
      the resolver's `--event <name>`, and `depot ci run` with no event at all. Falls back to a full
      run when a base does not resolve, because an empty affected set is a green no-op.
- [x] **Run independent steps concurrently** (Depot CI `parallel:`) — `check`'s nine no-build gates,
      `check`'s slow checks (knip against `check-plugin-set` + `docs:bundle` in one moon invocation),
      and the per-cell preparation in `test` and `e2e`. Stage 3's `fail-fast: false` replaced the
      `continue-on-error`-plus-gate-step pair. Not applied to `memory` (its three steps must not
      overlap) or to the peer-dependency check (its lockfile `trap` does not survive cancellation).
- [x] **Un-break `check-cache-wiring.mjs`** — it looked for `./.github/actions/setup` under
      `.github/workflows`; the Depot migration moved every call site, so it passed by matching
      nothing. Now scans both trees, flattens `parallel:` groups, and fails on zero call sites.
- [ ] **Measure the two changes above.** The step collapse and the parallel blocks are argued from
      recorded per-step costs, not from a head-to-head run. Worth one dispatch on a warm cache.

- [x] **Check that every moon-running job has a cache credential** —
      `scripts/check-cache-wiring.mjs`, run in `check`. `model-fixture.yml` landed from main after
      the call sites were wired and had neither binding nor opt-out, which the setup action caught
      in CI; this catches it before pushing.
- [x] **Reword the cache warning** in `AGENTS.md`, `REPOSITORY_GUIDE.md` and the
      composer-plugin-dev skill — it is harmless, but it means no shared cache, and the docs said
      to filter it rather than fix it.
- [ ] **Audit restore-vs-rebuild cost per task.** 8 of 12 measured tasks were slower to restore
      than to rebuild, `composer-app:prebuild` by 35× — ~146 s per job. That is a property of the
      task, not the cache, so a faster cache does not fix it: `options.cache: false` on
      high-output-bytes/low-compute tasks does. Numbers in [`REPORT.md`](./REPORT.md).
- [ ] **Measure `remote.cache.compression: 'zstd'`** — currently unset, so no client-side
      compression. Its own arm, not folded into a hosting change.
- [ ] **13 MB of video in `docs/public/`** — two checked-in mp4s that Astro copies into
      `docs:bundle`'s output. Worth removing on its own merits.

## Phase 3: E2E stabilization

The four flake causes, the refuted hypotheses and the measurement hazards live in
[`DESIGN.md`](./DESIGN.md) — read "Refuted — do not retry these" and "Measurement hazards" before
spending a round-trip here; between them they cover four dead ends and a dozen ways a local result
lies. Each item below is done only when it runs green in CI **without a retry**.

Where the suite stands: 33 iterations of dispatch-fix-redispatch reached five consecutive runs with
all nine cells green (on `af0b657b`; the matrix is 6 cells since the composer/rest split). The bar
has since moved to ten green runs, which cause A blocks.

### Flake causes in the enabled tests

- [x] **Comment marker landed on the wrong thread** (cause B) — the editor keyed comments by a URI
      whose spelling changes when a draft persists, so a click's `scrollCommentIntoView` lookup missed
      and the proximity tracker restored the previous thread. Keyed on the stable object id.
- [x] **Text typed into an unbound editor was destroyed** (cause C) — a user-facing data-loss window,
      not only a test failure. Non-editable until the content binding attaches, with a regression test.
- [ ] **Cause A: the production-edge two-peer path** — invitations and replication stall; dominant,
      and endemic in production rather than test-induced. **DX-1152** on the edge side (assigned to
      Mykola); `dxos/edge#840` should heal the replication half. The client half (an unacknowledged
      swarm JOIN with no repair path) needs DX-1152's ask #3 — the JOIN-ack semantics — answered first:
      a repair loop built on a guessed acknowledgment was measured and reverted.
- [ ] **Cause D: mosaic story never paints on webkit** — 1 of 10 runs, does not reproduce locally
      (35/35). Deliberately ungated; needs a CI trace, not a guess.
- [ ] **Sweep the other unbound-editable windows** — `MarkdownField`, `TemplateEditor`, `SpecArticle`,
      `CodeArticle`, `Outline` share cause C's conditional-binding shape. One shared guard (or a guard
      inside the automerge extension) rather than five patches.
- [ ] **Ten green campaign runs**, then **VM sizing** (how small the e2e runners can go; interacts with
      the `workers` default). Both blocked on cause A by arithmetic, not by code quality.

### Deferred tests — 42 off (16 `test.fixme`, 11 `test.skip`, 5 suites)

Browser gates are listed only where this work changed them. Ordered by cost to fix.

- [x] **Fix `cli:bundle`** — #12398 dropped the five `@opentui/core-<platform>-<arch>` packages from
      the CLI manifest as unused. Nothing imports them; they exist so pnpm installs all five native
      libraries for the five-target cross-compile, and without them every run failed with
      `Could not resolve: "@opentui/core-darwin-arm64/index.ts"`. Restored and registered in knip's
      `BUNDLER_RESOLVED` so they are not stripped again.
- [x] **`createSpace()` proves a space was created** — `waitForSpaceReady()` only requires the selected
      workspace to match the URL, which the space the app is already in satisfies, so a submit that did
      not take read as success and failed later in the calling test.
- [x] **Comments deletion race** — `delete message`, `delete thread` and `undo delete thread` are back
      on. The editor's `cm-comment` decoration is dropped asynchronously after a thread is deleted; the
      assertion now has 30 s. If it fails again the decoration is never removed, which is a product bug
      rather than a slow one.
- [x] **Mosaic drag-and-drop** — two product bugs (see DESIGN.md). 21/21 and 15/15 per browser after
      the fix, from 0/5 on firefox for `rearrange within column`; no deferred test left in that package.
- [ ] **Testid on the type-picker option** — `createObject()` targets
      `getByRole('listbox').getByText(type)`, which the `browser-e2e-tests` skill forbids. Highest
      leverage item here: most of composer's suite goes through this helper.
- [ ] **Re-check the wholesale-skipped suites**, each of which states a checkable condition:
      `Inbox` (4, disabled in #12481 while mail sync moves to EDGE — the migration may still be in
      flight), `Welcome focus` (2, no reason given; runs against storybook via `e2e-welcome-focus`, so
      the local composer loop does not cover it). Verified **not** cheap: `First-run` (2) still fails
      immediately with `helpPlugin.tooltip` never rendering — blocked on the beta auth flow, not the
      tests; `Table tests` (6) all fail at `locator.fill` on the table cell and need real diagnosis.
- [ ] **Delete rather than fix** the three carrying a `Remove?` note — `Basic tests › reset app` (the
      button no longer exists), and `react-ui-table`'s two `relations work as expected` (duplicate a
      story play function). Then record a reason for the three that have none at all:
      `examples › Demo › airplane mode`, `batching`, `react-ui-table › test toggles`.
- [ ] **halo `joinNewIdentity()` — unblocks 2 tests.** Both halo tests fail identically: 30 s timeout
      filling `halo-invitation-input` after the helper resets storage and reloads. `halo.spec.ts` has
      no live tests. Related to cause A — `join new identity` also fails as a live device-invitation
      stall.
- [ ] **todomvc replication — 2 tests, one cause.** `edit a task` (the edit never reached the guest)
      and `toggle all tasks & clear completed` (`toBeChecked` never settled). Same two-peer setup as
      cause A.
- [ ] **`delete message` on webkit** — `toHaveCount` still fails ~1 in 12, distinct from the marker
      defect. Also seen once on chromium at 2 workers (`cm-comment` count stuck at 1; trace lost to
      the outputDir clear).
- [x] **`guest joins host's space` — re-enabled.** Its one failure was replication, **not** invitation
      (the guest reached the doc and the editor kept its placeholder — firefox, run 31313863039), i.e.
      cause A. The fixme was self-blocking (its re-enable condition was a CI trace, which only a live
      test can produce) and bought nothing while its sibling `changes` test ran the same two-peer path
      live. Expect it to fail at cause A's ambient rate until DX-1152 lands; a failure now yields the
      trace.
- [ ] **kanban suite on webkit** — story-boot stall, no column painted in 45 s; gated at `beforeEach`
      with evidence. A preload lowered the rate only and `check-cycles` finds no static cycle; the
      decided remedy is the built-storybook follow-up below, and the skip's removal is that item's
      done-condition.
- [ ] **Collaboration remainder** — live: `changes` and `guest joins host's space`, both riding cause
      A's rate (DX-1152 noted at the describe block). Still deferred: `cursors` (documented as
      depending on winning a race the test cannot observe; storybook covers it) and `presence`
      ("Fix.").
- [ ] **Startup harness, and the four tests CI never runs.** The pool is every project with an `e2e`
      task, so composer's `e2e-startup`, `e2e-dev` and `e2e-welcome-focus` tasks sit outside it — re-enable `warm-cold start` (deferred pending the
      ResetDialog race; only ever passed on the retries since removed), `warm start` (30 s
      `waitForReady` too tight under load) and `Welcome focus` for their own sake, not to make Check
      green.
- [ ] **Needs a product change or is platform-bound** — the storage-version error boundary (reset no
      longer wipes old data; needs an upgrade path), `cut & paste comment` (paste unavailable
      headless, may be unfixable), `devtools-extension › Basic test` (Playwright cannot load
      extensions headless; likely stays off).
- [ ] **Follow-up, not this PR: convert storybook-driven suites to storybook tests** — `react-ui-table`
      (~12), `plugin-sheet` (3), `lit-grid` (3), `welcome-focus` (2). Kanban and mosaic are excluded:
      drag-and-drop does not work as a storybook test. Composer and todomvc are genuinely end-to-end
      and stay in Playwright.
- [ ] **Follow-up, not this PR: run storybook e2e against a BUILT storybook** (decided direction for
      the kanban/mosaic story-boot stall, `Cannot access 'makeSpaceService' before initialization`).
      A bundle has a fixed evaluation order, so `storybook dev`'s arrival-order race cannot exist —
      and it removes the per-request compile behind the 45 s boot budgets. **Blocker to clear
      first:** the spike's built story never renders when served (strictly worse than dev), so the
      avenue starts with root-causing that no-render, not with wiring configs. Secondary diagnosis
      of the dev-server TDZ itself, if ever needed: the graph is cycle-free, so the mechanism is
      either a poisoned module record (an earlier swallowed throw leaves bindings permanently
      uninitialized — find the first throw with a console recorder on a losing run) or duplicate
      module identities in vite dev (source-alias vs optimized-dep URL). Known: the preload in
      `plugin-kanban/.storybook/preview.mts` drops the rate 8/14 → 0/14 but is per-package and
      rate-lowering only. Done when the kanban webkit skip in `smoke.spec.ts` is removed and holds
      green in CI.

### Before landing PR #12482

- [x] **Fold the satellite docs into this project** — `E2E-STABILIZATION.md`,
      `E2E-FLAKE-ROOT-CAUSES.md` and the moon-cache-slowness superpowers handoff are gone; their
      content is in DESIGN.md and this file, with `.github/workflows/README.md` and the registry
      repointed.
- [x] **Comment audit of the whole diff** (`7fb6c887`) — 231 comment lines cut: no block over three
      lines, no history narration, and CI run IDs only inside a `TODO` as a reproduction pointer (the
      evidence lives in DESIGN.md, and Actions logs expire). Three duplication findings were fixed
      rather than reworded:
      the `url`-vs-`port` `webServer` block was copy-pasted verbatim into five storybook playwright
      configs, now `storybookWebServer(port)` in `@dxos/test-utils/playwright`; `testbench-app`'s copy
      blamed `storybook dev` for a config that runs `vite preview`; and `.config/knip.ts` declared
      `'packages/devtools/cli'` **twice in one object literal**, so the first entry was dead and the
      `@opentui` explanation appeared twice. The URI-vs-object-id rule is now stated once, on
      `CommentState.current`. Verified: knip exit 0, lint 8/8, `Obj.test.ts` 49/49,
      `useExtensions.test.tsx` 2/2, all five configs load under `--list`.
- [x] **Second pass: the yml files the first audit missed** — the first pass filtered the diff to
      `*.ts`/`*.tsx`, so `check.yml`, `.moon/tasks/tag-e2e.yml` and the seven `moon.yml` files were
      never audited, and they were the worst offenders: 144 added comment lines down to 78. The
      "these four env vars must be IDENTICAL" block appeared **twice verbatim** in `check.yml`, and the
      second copy said "`e2e`'s block below" while sitting inside that very job; the storybook-deps
      comment appeared verbatim in five `moon.yml` files. Env-var `inputs:` entries no longer carry
      prose — a declarative list documents itself. Proven comment-only by stripping `#` lines and
      diffing against HEAD; all nine files still parse.
- [x] **Move the rejected sharding strategies out of `.github/workflows/README.md`** — a workflows
      README should describe the workflow that exists, so the Knapsack Pro / per-browser-variant
      comparison now lives in DESIGN.md next to "Refuted", and the README points at it rather than the
      other way round. No Knapsack code or dependency remains; the changeset still names the removal,
      which is correct there.
- [x] **User review pass over the diff** (through `fb997f9d`) — the kanban preload comment corrected
      (it claimed a cycle that `check-cycles` disproved) and the built-storybook direction decided;
      the `invokePromise` contract JSDoc dropped (the invoker test is the pin); the slow
      edge-replication convergence test deleted — its harm (create-space discarding a live space) is
      pinned by plugin-space `create.test.ts`'s rejecting stub, and the client-side deadline keeps
      its rationale comment; `currentObjectId` moved out of `ReviewCapabilities` into plugin-review
      `util/comment-state.ts` (a helper, not a capability).
- [x] **Restore `quarantine: true`** on both e2e uploader steps — `false` was for the campaign, so a
      masked failure could not make a green cell unfalsifiable; all eight uploads now agree.
- [x] **Sync with main** (Changesets v3 added a `check-changeset-bumps` step whose script the branch
      lacked, so the `check` job failed until the merge) **and drop draft status.**
- [x] **Move `check-boot-budget` off the e2e cell** — it is now the last check in the `check` job's
      stage 3, which also makes it gate the PR. Landed with the `check` job's
      cost-ordered stages (DESIGN.md, "The `check` job runs in three stages"): stage 1 the ~30 s
      no-build gates with `format-check` leading, stage 2 the compile gate, stage 3 `knip` +
      `check-boot-budget` as the only report-all pair. The peer-dependency step moved from last to
      stage 1 behind a `trap` that restores `pnpm-lock.yaml` — confirmed empirically that the
      lockfile is a hash input to every task (editing it re-hashed a cached `dx-build:build`).
- [x] **Measured the cold cost of `check-boot-budget` on the `check` job: 53 s**, of which
      `composer-app:bundle` built from source in 28 s. Run 31539993812 reported 284 tasks completed
      with 281 cached, so the libraries hydrated and only the bundle ran; the script itself is 28 ms.
      The dedicated-job fallback (`needs: e2e-bundle`) is therefore not needed. Note the e2e cell's
      former 50 s was NOT a cache hit as assumed — building this bundle simply costs ~30 s once its
      closure is warm.

## Phase 4: Storybook failures the cache was hiding

Restoring the `@opentui` platform packages changed `pnpm-lock.yaml`, which is an input to nearly
every moon task, so it invalidated the whole cache graph. The `storybook` job had been passing on
cached entries, and each run since has exposed another deterministic, pre-existing failure. None
originate on this branch; a green Check elsewhere is likely green the same way.

- [x] **`plugin-assistant › AssistantSettings › Default`** — the story renders a component that
      reads a capability through `useOptionalCapability`, which raises without a
      `PluginManagerContext` rather than returning undefined, so it could not render. Fixed with a
      `withPluginManager` decorator; 47/47.
- [x] **`plugin-tasks › Convert To Task`** — asserted a sub-pixel spread across every `.cm-line`,
      but the editor's first line carries the content's top padding in its bounding box (56px vs
      32px), so it could not pass whatever the anchor chip did. Instrumenting it showed the chip's
      line at 32px — the property under test was holding. Now compares against one plain sibling;
      9/9.
- [ ] **`stories-projects`** — `FactSummaries`, `SenderLedger` and `SenderResearch` `Test` stories
      all fail with `operation invocation failed {opKey:
dxn:org.dxos.plugin.projects.operation.create, cause: "Error: Process produced no output"}`.
      2 of 3 in CI, 3 of 3 locally. These are the CI-runnable stories — the model-dependent variants
      are tagged `!test` — so this is a regression in the operation stack, not a missing service.
      Narrowed to `ProcessOperationInvoker.ts:88`: the handle's output stream completes without
      emitting while the process is neither `FAILED` nor `TERMINATED`, which is the `default` branch
      that raises this message. So the process ends without ever writing an output rather than
      erroring. Further than that is compute-runtime and plugin-projects territory, not this work.
- [ ] **Decide whether the cache should be able to hide this.** A task whose inputs have not changed
      is not re-run, which is the point; but it means a deterministic failure can sit green for as
      long as nothing upstream of it moves. Worth a periodic uncached run of `:test-storybook` on
      main rather than discovering the backlog the next time a lockfile changes.
