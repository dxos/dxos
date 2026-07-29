# Changesets — Authoring Guide for Agents

How to decide whether a PR needs a changeset, and how to write one. Full release design: [`.github/RELEASE-SPEC.md`](../../.github/RELEASE-SPEC.md).

**The rule:** add a `.changeset/*.md` when — and only when — the change is worth a **changelog entry**, i.e. consumer-relevant (behavior, public API, types, a fix, a perf change, or a consumer-visible dependency bump). The code ships with the next release either way; the changeset decides whether it's _recorded_ in the changelog (and contributes a version bump). Not changelog-relevant → omit it, and **never add an empty changeset** to silence the reminder. CI's `changeset-reminder` (in **Check**) posts an advisory sticky comment when a PR touches publishable source without one — a nudge, never a blocker.

## Do I need one?

1. Changed a package that **publishes to npm** (Group A or B — below) in a way a consumer can observe? → **yes.**
2. Otherwise → **no.** App/private code (`composer-app`/`-crx`/`-dxos-org`, `docs`, `todomvc`, `tasks`, `testbench`), internal tooling, tests / e2e / fixtures, docs, CI, formatting, or a refactor with no consumer-visible effect. (App/docs/CI changes don't trip the reminder; a no-op refactor in a publishable package might — ignore it.)
3. **Unsure? Write one** — a spurious `patch` is cheaper than a missed release.

## Which package to name

Name **one package you changed**. Groups A and B are `fixed` lockstep groups, so **naming any one member bumps the whole group** — never enumerate a group, and never name a downstream dependent (the ripple bumps dependents automatically; a Group A change also patch-bumps Group B):

- **Group A** — core / SDK / UI / devtools / reflect, plus internal private `@dxos` packages (versioned in lockstep, not published). Representative name: `@dxos/echo`.
- **Group B** — every `@dxos/plugin-*` and `@dxos/cli`. Representative name: `@dxos/plugin-markdown`.

**Apps are not in Changesets** (Composer, docs, examples) — they deploy, never publish, so an app change needs **no** changeset and naming one has no effect (they're `ignore`d). To ship a Composer version, dispatch **Deploy Apps → production** (its `release` job bumps + tags Composer) — not a changeset.

## Which bump level

Standard semver, the same rules pre- and post-1.0:

| Change                               | Pre-1.0 (`0.x`)                                                 | Post-1.0 |
| ------------------------------------ | --------------------------------------------------------------- | -------- |
| Bug fix / perf / observable internal | `patch` (`0.9.0 → 0.9.1`)                                       | `patch`  |
| Backwards-compatible feature         | `minor` (`0.9.0 → 0.10.0`)                                      | `minor`  |
| **Breaking change**                  | `minor` (`0.9.0 → 0.10.0`) — at `0.x`, breaking rides the minor | `major`  |
| Deliberate `1.0.0` cut               | `major`                                                         | —        |

A `minor` does **not** cascade the group to `1.0.0` (the tooling keeps standard semver at every version — mechanics live in the spec). Note breaking changes in the **body** so they reach the changelog.

## Body + format

`.changeset/<slug>.md` (any unique slug). One or two sentences, **changelog quality** — the body ships verbatim in `CHANGELOG.md` (via `@changesets/changelog-git`), so write it from the **consumer's** point of view and end with a period.

```md
---
'@dxos/echo': patch
---

Fix subscription leak in the query handler.
```

✅ `Add streaming variant of Query.run().` &nbsp;&nbsp; ❌ `refactored stuff` / `addresses review comments` / `WIP`

Packages from _different_ groups in one PR → one line each (each still bumps its whole group):

```md
---
'@dxos/echo': minor
'@dxos/plugin-markdown': patch
---

Add streaming query API and surface it in the markdown plugin.
```
