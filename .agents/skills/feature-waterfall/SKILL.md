---
name: feature-waterfall
description: >-
  Carry a change to the feature map (`FEATURES.mdl`) down through every layer below it — spec, spec
  review, tasks, code, result — with one commit per layer, so the history shows the chain from intent
  to working code. Use when a feature is added to or changed in `FEATURES.mdl`, when asked to "run the
  waterfall" or "cascade" a feature, when `deus features check` reports a status the reviews do not
  support, or to bring the whole map up to date. For reviewing a spec on its own use `spec-review`;
  for writing a spec use `mdl`.
---

# Feature waterfall

The repository states intent in five layers, each derived from the one above and checked against the
one below:

```text
feature map  FEATURES.mdl            what the product should do          (person or agent)
  > spec     PLUGIN.mdl / SPEC.mdl   how one package meets it            (mdl skill)
  > review   <SPEC>.review.mdl       how far the code meets each item    (spec-review skill)
  > tasks    TASKS.md beside spec    the work that closes each gap
  > code     sources + tests         the behaviour
  = result   re-run review + status  proof that the feature holds
```

The format of the map is `packages/reflect/deus/lang/features.mdl`; read it once. The tool is
`pnpm deus features check` (derived status per feature, plus what is out of step) and
`pnpm deus features tasks <id>` (the open spec items of one feature).

A run is **one feature at a time**, and it ends only when `deus features check` shows the feature's
authored and derived status agree with no warning for it, or at a blocker you report.

## Finding the work

1. If the request names a feature, take it. Otherwise diff the map against its base —
   `git diff origin/main -- FEATURES.mdl` — and take each `feature` block that is new or whose `specs`,
   `status` or `note` changed. The `## Changelog` decision that came with the change says who asked
   and why; the spec decisions you write later name that person in `for:`.
2. Run `pnpm deus features check` and note the feature's row. A new feature usually fails with
   `names no reviewable item of the spec`: the spec item it cites does not exist yet, and layer 1
   writes it.

## The layers — one commit each

Commit after every layer, as `<scope>: <layer> — <feature id>` (`plugin-zen: spec — zen.sleep-fade`),
so `git log --oneline` reads as the waterfall. Run the layer's check before each commit. Run
`pnpm format` before the first commit and again before you push.

1. **Spec.** Write or change the items the feature cites, in the spec it names (`mdl` skill): a
   `feat` with `req` items stating the behaviour a test can check, `op`/`type`/`component` blocks for
   anything new the code will expose, a `scenario` when there is a user flow. Keep the feature's
   intent; do not widen it. Add a `## Changelog` decision (`by: agent:claude-code`, `for:` the person
   from the map decision). Check: `pnpm deus lint <spec>`, and `pnpm deus features check` no longer
   errors for this feature.

2. **Review.** Judge the new or changed items against the code (`spec-review` skill), editing only
   their verdicts in the existing review and leaving the others as they are. Set the frontmatter
   `commit:` to the spec commit and `date:` to today. New behaviour is normally `missing` here — that is
   the point: the review is the gap analysis. Check: `pnpm deus review check <review>`; the feature's
   derived status is now `planned` (or `in-progress` when some of it already exists).

3. **Tasks.** Run `pnpm deus features tasks <id>` and put its output in the `TASKS.md` beside the spec
   (create the file if there is none) under `## <feature id>: <name>`. Turn each line into a task that
   can be done and verified on its own, and keep the item id on it (`- [ ] F-6.1: …`) so a task traces
   to the spec. Set the feature's `status: in-progress` in `FEATURES.mdl` with a changelog decision.
   Check: `pnpm deus features check` shows no "no work planned" warning for the feature.

4. **Code.** Do the tasks, each with a test that exercises the item it closes, and tick them as they
   pass. Follow the repository's rules (AGENTS.md: no casts, Effect over Promise, tests after every
   step). Check: the package's tests, lint and typecheck
   (`moon run <pkg>:test`, `moon run <pkg>:lint`, or the cloud-sandbox fallbacks). Do not mark a task
   done whose test you have not seen pass.

5. **Result.** Re-review the feature's items against the new code: each becomes `done` with its
   test cited in `tests:`, or stays open with a note. Set the review's `commit:` to the code commit.
   Then set the feature's authored status to what `deus features check` now derives (`operational`
   when every item is done) with a changelog decision citing the commits. Check:
   `pnpm deus review check <review>` has no errors and `pnpm deus features check` shows the feature's
   two statuses equal and no warning for it.

## Reporting

End with a table, one row per layer: the layer, the commit, and the evidence (the check output that
proved it). Then the feature's row from `deus features check` before and after the run. If a layer
cannot be finished, stop there, say which check failed and why, and leave the feature's status
truthful (`in-progress`, never `operational` on hope).

## Rules

- The feature map is intent. Never change a feature's `specs` or `note` to fit what the code does;
  change the spec or the code. Only its `status` moves, and only to what the reviews support.
- A review never edits a spec, and a spec edit always gets a changelog decision.
- One feature per run keeps each commit's layer readable. A second feature is a second run.
