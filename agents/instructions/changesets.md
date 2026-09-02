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

**`major` is rejected by CI while we are pre-1.0** (`pnpm check-changesets`, a gate in **Check**). The groups are `fixed`, so one stray `major` versions all ~300 packages to `1.0.0` in a single release — and nothing surfaces the mistake until `changeset version` runs on `main`. Write `minor` and describe the break in the body.

## When to write it

Write the changeset at two moments, each time from the **whole diff** against the merge base:

1. **Opening the PR** — after the code is done, read `git diff origin/main...HEAD` and write the body
   from what the PR changes as a whole.
2. **Before landing** — reread the file against the diff as it stands now. If the PR moved (review
   fixes, scope changes), **rewrite the file from scratch**; a body that still describes the PR stays
   as it is.

Those two moments are the only ones: the file is a **summary** of the finished PR, and a reader of
`CHANGELOG.md` wants what changed for them, not the order it was built in. Every update replaces
the whole body. A body grown a sentence per commit or per review round ("Add X. Also fix Y. Rename
Z per review.") is a **log**, and leaks process into the release notes.

## Body + format

`.changeset/<slug>.md` (any unique slug). One or two sentences, **changelog quality** — the body ships verbatim in `CHANGELOG.md` (via `@changesets/changelog-git`), so write it from the **consumer's** point of view and end with a period. Describe the net effect of the PR: what the consumer can now do, or what stopped happening.

```md
---
'@dxos/echo': patch
---

Fix subscription leak in the query handler.
```

✅ `Add streaming variant of Query.run().` &nbsp;&nbsp; ❌ `refactored stuff` / `addresses review comments` / `WIP` / `Add streaming query. Also fix the leak found in review.`

Packages from _different_ groups in one PR → one line each **in the same file** (each still bumps its whole group):

```md
---
'@dxos/echo': minor
'@dxos/plugin-markdown': patch
---

Add streaming query API and surface it in the markdown plugin.
```

## How many files

**One per PR** — and unlike the missing-changeset reminder, this one is a gate: `pnpm
check-changesets` in **Check** fails a PR that adds more than one `.changeset/*.md`, counted against
the merge base. A changeset is a changelog entry, so the question is how many entries a reader wants —
not how many packages, groups, or commits you touched. Work spanning two groups is still one story and
belongs in one file with a line per group, as above; so does a fix that took five commits.

Add a second file **only when the PR genuinely addresses two unrelated things** a reader would look up
separately — e.g. a query-planner fix that happens to ride along with an unrelated toolbar change. If you
catch yourself writing "and also" between two unrelated clauses, that's the signal; short of it, splitting
one piece of work fragments the changelog into entries nobody can follow and re-reads as several releases'
worth of change. That case waives the gate with a **YAML comment** in one file's front matter — a comment,
so `@changesets/parse` drops it and the reason never reaches `CHANGELOG.md`:

```md
---
# multiple-changesets: unrelated toolbar fix rides along with the query-planner fix
'@dxos/plugin-markdown': patch
---

Keep the toolbar overflow menu open while a submenu is focused.
```
