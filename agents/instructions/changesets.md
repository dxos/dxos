# Changesets — Authoring Guide for Agents

How to decide whether a PR needs a changeset, and how to write one. Full release design: [`docs/design/release-spec.md`](../../docs/design/release-spec.md).

> **Status: active.** Add a `.changeset/*.md` whenever a change is worth recording in the changelog (a consumer-relevant change — behavior, API, fix, perf). It is **not required**: `scripts/check-changeset.mjs` is advisory, and the **Check** workflow's `changeset-reminder` job posts a sticky comment on a PR that changes publishable source without one — a nudge to catch accidental omissions, never a blocker. A change that isn't changelog-relevant simply omits the changeset; do **not** add an empty changeset. The legacy conventional-commit PR-title gate still runs in parallel during the overlap; it is removed once the first Changesets `@latest` release lands.

## The one rule

**Add a changeset when (and only when) the change is worth a changelog entry** — i.e. consumer-relevant. The code ships with the next release either way; the changeset decides whether the change is *recorded* in the changelog (and contributes a version bump). If a PR changes publishable source without one, CI posts a reminder comment (advisory, never blocking) so a forgotten changeset gets noticed — but a change that isn't changelog-relevant just omits it. Don't add empty changesets to silence the reminder: `.changeset/` holds only real entries.

## Do I need a changeset? (decision tree)

1. **Does the PR change a package that publishes to npm** (a Group A or Group B member — see below) in a way a consumer could observe? Behavior, public API, types, a dependency bump that reaches consumers, a bug fix, a perf change → **write a changeset.**
2. **Otherwise — not changelog-relevant: omit the changeset.** This covers private/app code (`composer-app`, `composer-crx`, `composer-dxos-org`, `docs`, `todomvc`, `tasks`, `testbench-app`), internal tooling, `e2e`/fixtures, tests, markdown/docs, CI/workflows, comments, formatting, *and* a refactor inside a publishable package that a consumer cannot observe. Docs/CI/app-only changes won't trigger the reminder (not publishable source); a no-op refactor in a publishable package will — ignore it when there's nothing to record.
3. **Unsure?** Write one. A spurious `patch` is far cheaper than a missed release.

## Which package to name

- Name **the package you changed**. Group A and Group B are `fixed` lockstep groups, so **naming one member bumps the whole group** — never enumerate the group.
  - Changed core/SDK/UI → name one **Group A** package, e.g. `@dxos/echo`.
  - Changed a plugin or the CLI → name one **Group B** package, e.g. `@dxos/plugin-markdown` or `@dxos/cli`.
- **Apps never publish — don't name an app to ship it.** Apps deploy via `deploy-apps.yml`, decoupled from publishing; a normal app change needs no changeset (the check auto-passes app-only PRs). The one exception: to cut a new **Composer desktop/extension build version**, name `@dxos/composer-app` (or `@dxos/composer-crx`) in a changeset — this bumps only that app's own version line (no plugin/core publish), and the desktop/Tauri build reads it.
- You do **not** need to name downstream packages that merely depend on what you changed — Changesets bumps dependents automatically (the ripple).

## Which bump level

Use **standard semver** — the same rules pre- and post-1.0:

| Change | Pre-1.0 (`0.x`) | Post-1.0 |
| --- | --- | --- |
| Bug fix / perf / internal | `patch` (`0.9.0 → 0.9.1`) | `patch` |
| Feature (backwards-compatible) | `minor` (`0.9.0 → 0.10.0`) | `minor` |
| **Breaking change** | `minor` (`0.9.0 → 0.10.0`) — the `0.x` convention: breaking rides the minor | `major` |
| Deliberate `1.0.0` cut | `major` (`0.9.x → 1.0.0`) | — |

A `minor` **no longer cascades the whole group to `1.0.0`** — that was a Changesets misbehavior (a peer-dependent's bump was force-escalated to `major`), fixed by the setup below. So at `0.x`, put breaking changes in the **minor** and reserve `major` for the intentional `1.0.0` cut. Note breaking changes in the changeset **body** so they land in the changelog.

### Why Changesets is patched

Correct semver here depends on three things working together (all already configured — don't undo them):

- **`peerDependencies` use `workspace:^`**, not `workspace:*` (regular deps stay `workspace:*`). A caret range means an in-range minor of a peer isn't read as breaking; an exact pin (`workspace:*`) would be.
- **`onlyUpdatePeerDependentsWhenOutOfRange: true`** in `.changeset/config.json` — only escalate a peer-dependent when the dependency actually leaves its range (the default escalates on *any* non-patch change).
- **A local patch of `@changesets/assemble-release-plan`** (`patches/@changesets__assemble-release-plan@6.0.10.patch`) — when a peer change *is* out of range, the dependent escalates to `minor` below `1.0.0` (the `0.x` rule) instead of `major`. Without it, a `0.x` breaking peer change still jumps to `1.0.0`.

**The flag and the patch are independent code paths that cover *different version regimes* — you need both, and neither depends on the other.** In `assemble-release-plan`, the flag is passed into `shouldBumpMajor()` (it decides *whether* a peer-dependent is force-bumped); the patch edits the line *inside* the branch `shouldBumpMajor()` guards (it decides the bump *type*, `major` → `0.x ? minor : major`). They divide as:

| Regime | Peer caret range | What happens | Load-bearing piece |
| --- | --- | --- | --- |
| **Pre-1.0** | `^0.9` **excludes** `0.10` | a `minor` is *out of range* → `shouldBumpMajor` is true regardless of the flag → the patched branch runs → `minor` (not `1.0.0`) | **the patch** (the flag is effectively inert here) |
| **≥1.0** | `^1.2` **includes** `1.3` | a `minor` is *in range* → the flag makes `shouldBumpMajor` false → the dependent isn't force-bumped at all | **the flag** (the patch's branch is never reached) |

Without the flag the cascade *reappears at 1.x* (dependents forced to `2.0.0` on every minor); without the patch it stays broken pre-1.0. `workspace:^` is what makes "in range" mean the right thing in each regime.

Together these make `changeset` behave like plain semver at every version (`patch→patch`, `minor→minor`, `major→major`). If you upgrade the `@changesets/*` packages, re-verify/re-create the patch — pnpm fails loudly on install if it no longer applies. The patch targets the CommonJS build (`dist/*.cjs.js`) that the `@changesets/cli` (CommonJS) loads; the `.esm.js` copy is intentionally left unpatched because the CLI never loads it. Verify it's actually applied after an install: `@changesets/cli` must symlink to the `_patch_hash=…` variant of `@changesets/assemble-release-plan` in `node_modules/.pnpm`, and its `dist/*.cjs.js` line ~227 should carry the `// DXOS patch` comment (the plain, un-suffixed copy stays unpatched — that's expected).

## What to write in the body

One or two sentences, **changelog quality** — it ships verbatim in the published `CHANGELOG.md` (via `@changesets/changelog-github`). Describe the change from a **consumer's** point of view, not the implementation or the PR process. End with a period.

- ✅ `Fix subscription leak in the query handler.`
- ✅ `Add streaming variant of Query.run().`
- ❌ `refactored stuff` / `addresses review comments` / `WIP`

## File format

`.changeset/<slug>.md` (any unique slug):

```md
---
"@dxos/echo": patch
---
Fix subscription leak in the query handler.
```

Multiple packages from *different* groups in one PR → list each (one line per group is enough, since each name bumps its whole group):

```md
---
"@dxos/echo": minor
"@dxos/plugin-markdown": patch
---
Add streaming query API and surface it in the markdown plugin.
```

## Reference: the groups

- **Group A — Core/SDK** (fixed): core + common + sdk + ui + devtools + reflect (+ storybook, versioned-not-published). Representative name: `@dxos/echo`.
- **Group B — Plugins + CLI** (fixed): all `@dxos/plugin-*` + `@dxos/cli`. Representative name: `@dxos/plugin-markdown`.
- **Apps (Composer, docs, …)** are in **no** publish group: they deploy, never publish. Naming any one member of a fixed group bumps that entire group. A Group A change also patch-bumps Group B (the ripple), so you do not need a Group B changeset just because core changed.
