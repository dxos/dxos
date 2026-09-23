# Evaluating walkthroughs

A walkthrough is generated prose a reviewer reads instead of the diff. Two things can go wrong with
it, and they need different instruments:

- It can be **wrong**: cite a symbol the change never touches, point a fence at a file the patch does
  not contain, or leave half the hunks unmentioned. Wrong is checkable against the patch.
- It can be **hard to read**: right about the change, and still slower to get through than the diff
  it replaces. Hard to read is a judgement, with measurable proxies.

Review time is the thing being optimised. A walkthrough that takes longer to read than the diff has
failed even when every claim in it is true.

## The three layers

1. **Deterministic scoring** (`src/walkthrough/score.ts`). Pure functions over the model's body and
   the patch. No model, no network, no fixtures to re-record. Runs on every generation if we want it
   to, and its dimensions are what an eval reports.
2. **LLM judge.** One call per walkthrough, graded against the rubric below. Catches what no regex
   can: whether the ordering builds, whether a paragraph says why or only restates the diff.
3. **Human ratings.** A handful of walkthroughs rated by the people who review, used to calibrate
   the first two. Without this the judge grades its own taste.

## What the deterministic scorer measures

`scoreWalkthrough(body, patch)` returns two sets of dimensions, each scored `[0, 1]` and carrying the
excerpts it scored on. Attribution is the point: a bare number is not actionable.

Correctness:

| Dimension            | Fails when                                                                                                                         |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `fences-resolve`     | A fence names a file the patch does not contain.                                                                                   |
| `fences-authentic`   | A fence carries lines the patch does not contain: the model transcribed a diff instead of leaving the fence for `fillWalkthrough`. |
| `hunk-coverage`      | Hunks reach the reader only through the appended `## Also changed` section.                                                        |
| `citations-grounded` | Prose cites an identifier or path that appears nowhere in the patch.                                                               |
| `generated-ignored`  | A fence points at a lockfile, a binary or another generated file.                                                                  |
| `structure`          | No single H1, or no H2 sections.                                                                                                   |

Readability:

| Dimension                | Fails when                                                              |
| ------------------------ | ----------------------------------------------------------------------- |
| `sentence-length`        | A sentence runs past 30 words, so the reader backtracks to parse it.    |
| `slop-free`              | Generated vocabulary (`crucial`, `robust`, `serves as`) per 1000 words. |
| `no-inline-headers`      | A bold label and colon restating the line it introduces.                |
| `sentence-case-headings` | Title Case Headings.                                                    |
| `prose-density`          | Fewer than ~25 words of prose per fence: a diff dump with headings.     |

Coverage is a floor, not a target. `fillWalkthrough` appends every unclaimed hunk, so the reader
never loses a change; a walkthrough that describes every hunk equally has ordered nothing and is the
diff again. Read `hunk-coverage` together with `prose-density` rather than maximising it.

Scoring reads the document above `## Also changed` only. `fillWalkthrough` appends every unclaimed
hunk under that heading, so a stored walkthrough carries a fence for every hunk in the patch;
counting them would score full coverage for a document that described nothing. Fence content counts
as authentic when its lines come from the patch, which is what makes a stored walkthrough score the
same as the model output it was built from.

## Running it against the real model

`scripts/generate-walkthrough.ts` produces walkthroughs, one-shot or chaptered, and fills them.
`scripts/judge-walkthrough.ts` runs the judge over blind packets. Both read `DX_ANTHROPIC_API_KEY`
and need `@anthropic-ai/sdk`, which they resolve from the workspace store rather than from this
package's manifest — it is declared in `SCRIPT_STORE_RESOLVED` in `.config/knip.ts`, so the package
does not carry a dependency only a hand-run eval uses. Neither script is wired into CI: both spend
money per run.

```bash
node --experimental-strip-types scripts/generate-walkthrough.ts evals/walkthrough/13288-large --mode=chaptered
node --experimental-strip-types scripts/judge-packet.ts prepare evals/walkthrough evals/judge-api
node --experimental-strip-types scripts/judge-walkthrough.ts evals/judge-api
node --experimental-strip-types scripts/judge-packet.ts report evals/judge-api
```

## Two-stage generation

A diff over 32 KB is planned into chapters rather than narrated in one prompt (`plan.ts`,
`DEFAULT_CHAPTER_THRESHOLD_CHARS`). The planner sees the file list and sizes, never contents, and
assigns every file to exactly one chapter; each chapter is then narrated against its own files. An
unreadable plan falls back to the one-shot path, because a walkthrough of part of the change beats
no walkthrough. Measurements are in `WALKTHROUGH-EVAL-RESULTS.md`.

## The judge rubric

One call, the walkthrough and the patch as input, four dimensions scored 1-5 with a one-sentence
reason each. Reasons are the output that gets read; the numbers are for tracking regressions.

1. **Order.** Does each section build on the last, with the core of the change first and its
   mechanical consequences after? A walkthrough in file-sort order scores 1.
2. **Why, not what.** Does the prose give the constraint, the failure avoided, the alternative
   rejected? Prose that narrates what the diff already shows scores 1.
3. **Load.** Could a reviewer who has not seen this code follow it once, without backtracking and
   without a term used before it is introduced?
4. **Trust.** Does anything read as invented: a confident claim about intent the diff does not
   support, a number with no source?

Grade with the patch in context, and ask the judge for the reason before the number, so the number
is the conclusion of an argument rather than a first impression.

## Building the corpus

Fixtures are real pull requests: `{ diff, remote facts, generated body }` recorded per PR under
`src/stories/` (`walkthrough-fixture.ts` is the existing shape). A row needs the diff, because every
correctness dimension is computed against it.

Pick for spread rather than volume: a one-file fix, a wide mechanical rename, a change split across
packages, a PR whose diff exceeds the prompt's budget so files get dropped, and one with renames or
binaries (no hunks to show). Ten rows chosen this way say more than a hundred sampled at random.

## Wiring it as an eval

Two options, and they answer different questions.

`@dxos/assistant-evals` (evalite, `Scorer.make`) answers "did the agent stack produce this". It boots
a full Composer harness, which a walkthrough does not need: the generator is one model call over a
diff.

A vitest eval in this package answers "did the prompt produce this", which is the question being
asked while the prompt is being tuned. It runs `generateWalkthrough` with a real `narrate` against
each fixture diff, scores the result, and asserts a floor per dimension. That is the cheaper loop,
and it is where a prompt change gets its feedback.

Assert floors, not exact scores: a floor catches a regression, an exact score fails on every model
update and gets deleted. Report the mean of each set as the row's mark, keep the per-dimension
evidence in the output, and gate on the floor only for correctness — readability floors are advisory
until human ratings calibrate them.
