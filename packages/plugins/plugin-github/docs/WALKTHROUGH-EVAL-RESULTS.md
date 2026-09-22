# Walkthrough eval results

Four prompt variants, four real pull requests, scored two ways: a deterministic grader over the
patch, and a blind LLM judge on the rubric in `docs/WALKTHROUGH-EVALS.md`. Every artefact is in the
repository — prompts under `evals/prompts/`, the corpus and its generated documents under
`evals/walkthrough/`, the judge packets and verdicts under `evals/judge*/`.

Reproduce the deterministic half with `moon run plugin-github:eval-walkthrough`.

## What was measured

| Variant        | What it adds                                                                                                         |
| -------------- | -------------------------------------------------------------------------------------------------------------------- |
| `v1-baseline`  | The prompt as it was before this work: structure, empty fences, "explain why".                                       |
| `v2-readable`  | Plus the reader rules: one idea per sentence, mechanism not feeling, active voice, plain words, no em dash.          |
| `v3-selective` | Plus: fence a repeated mechanical change once, every fence earns a paragraph, open each section with the constraint. |
| `v4-evidence`  | `v2` plus: use unchanged context as evidence, say so when the diff does not show why, one fence per repeated change. |

The corpus: a one-line constant bump (#13115), a focused bug fix with a regression test (#13153), an
eight-file feature (#13149), and a nineteen-file mechanical change whose diff overflows the prompt's
budget (#13150).

## Deterministic scores

Percent, four fixtures averaged.

| dimension              | v1     | v2     | v3     | v4     |
| ---------------------- | ------ | ------ | ------ | ------ |
| fences-resolve         | 100    | 100    | 100    | 100    |
| fences-empty           | 100    | 100    | 100    | 100    |
| hunk-coverage          | 79     | 88     | 74     | 70     |
| ranges-valid           | 91     | 100    | 100    | 94     |
| numbers-grounded       | 100    | 100    | 100    | 100    |
| citations-grounded     | 100    | 100    | 98     | 100    |
| structure              | 100    | 100    | 100    | 100    |
| sentence-length        | 77     | 95     | 84     | 83     |
| slop-free              | 100    | 100    | 100    | 100    |
| no-inline-headers      | 100    | 100    | 100    | 100    |
| sentence-case-headings | 100    | 100    | 100    | 100    |
| prose-density          | 100    | 92     | 100    | 100    |
| **correctness**        | **96** | **98** | **96** | **95** |
| **readability**        | **95** | **97** | **97** | **97** |

Only three dimensions move: sentence length, coverage, and range validity. The other nine sit at 100
for every variant, which means they are guardrails rather than a comparison — worth keeping, because
a regression on any of them is a document that lies, but they say nothing about which prompt is
better.

The reader rules did the one thing they were written to do: long sentences fell from 23% of the
corpus to 5%.

Coverage moved the other way by design. `v3` and `v4` are told to fence a repeated mechanical change
once, so on the nineteen-file PR they emit two fences where `v2` emits fourteen. The unclaimed hunks
still reach the reader through the appended `## Also changed` section. This is the tension the design
doc names: maximising coverage produces the diff again.

## Judge scores

Blind: variants copied under opaque letters, key withheld. Mean of order, why, load and trust, 1-5.

Round one, all three variants per packet:

| fixture              | v1   | v2   | v3   |
| -------------------- | ---- | ---- | ---- |
| 13115 one-line bump  | 4.50 | 3.75 | 4.00 |
| 13149 eight files    | 4.50 | 5.00 | 3.75 |
| 13150 nineteen files | 3.25 | 4.75 | 4.00 |
| 13153 bug fix        | 4.25 | 4.25 | 4.50 |
| mean                 | 4.13 | 4.44 | 4.06 |

Round two, `v2` against `v4`:

| fixture              | v2   | v4   |
| -------------------- | ---- | ---- |
| 13115 one-line bump  | 3.00 | 3.50 |
| 13149 eight files    | 4.00 | 4.50 |
| 13150 nineteen files | 3.50 | 4.00 |
| 13153 bug fix        | 5.00 | 4.00 |
| mean                 | 3.88 | 4.00 |

## What the runs actually taught

**The judge found bugs in the scorer, twice.** It read `numbers-grounded` flagging "a 10 second
timeout" as invented, checked the patch, and found `DEFAULT_NOTARIZE_TIMEOUT = 10_000` sitting on
the `@@` header line. The dimension was matching raw substrings against hunk bodies only. Grounding
now strips separators, scales by a thousand in both directions, and reads the header text. A metric
that calls a true statement a lie is worse than no metric: it teaches the model to drop the detail
that made the walkthrough worth reading.

**The judge also found a defect no dimension was looking for.** One `v1` document cited
`lines=394-224` — inverted, matching no hunk. `fillWalkthrough` silently falls back to the whole
file, so the reader sees plausible code and never learns the prose was pointing somewhere else.
That is now `ranges-valid`.

**Judge scores are not comparable across runs.** The same `v2` documents averaged 4.44 in round one
and 3.88 in round two, and one fixture moved 3.75 → 3.00 while another moved 4.25 → 5.00. The
within-packet ranking held up; the absolute number did not. Compare variants inside one packet, never
a mean against last week's mean.

**More detail is not more trust.** `v1` scored highest of round one on "why" (4.50) and lowest on
"trust" (4.00). It earns the "why" by reaching past the diff: the retry walkthrough asserts a failure
narrative the one-line patch cannot support. `v4` was written to get the same richness honestly, by
mining unchanged context, and it beat `v2` on three of four fixtures in round two.

**Coverage and load pull against each other, and neither number settles it.** On the nineteen-file
PR the judge preferred the document showing representative call sites with a one-line summary of the
rest (4.75) over the one showing three of fourteen with no summary (3.25). Its reason was not
coverage at all: the loser carried the inverted line range.

## Approaches tried, including the ones that did not work

- **Deterministic scoring alone.** Nine of twelve dimensions saturate immediately. Kept as a
  regression guard, discarded as a way to compare prompts.
- **Telling the model to trim fences aggressively (`v3`).** It obeyed — two fences on a nineteen-file
  change — and the judge marked it down on order and why: the argument went with the fences. The
  milder `v4` wording keeps the paragraph and drops only the repetition.
- **Running the corpus in one pass per variant.** Each generation runs in its own subagent seeing
  only one prompt and one diff, because a single run writing all variants would carry context from
  the first into the last.
- **Judging with labels visible.** Not attempted, deliberately. The packets are letters and the key
  is written outside the packet, since a judge told which document came from the newer prompt grades
  the label.
- **A moon task with `local: true`.** Not a field in this moon version, and an unparseable `moon.yml`
  fails every job in the workflow. It is `options.runInCI: false`.

## Limits of this measurement

The generator here is a Claude subagent following each prompt, not `generateWalkthrough` calling the
configured model through `AiService` — this sandbox has no model credentials. What the numbers
compare is prompts, under one model family, on four pull requests from one repository. They do not
predict what the deployed generator produces, and four fixtures cannot separate a 2% difference from
noise.

The judge is the same model family as the generator, which is the standard bias in this setup and
the reason the design doc asks for human ratings before readability floors are enforced.

## What to do with this

`v4-evidence` is the variant to ship, on the round-two result and on its reasons rather than its mean.
Before it graduates into `SYSTEM_PROMPT`, it wants one more round on fixtures it has not been tuned
against, and the human ratings that tell us whether the judge's ranking is our ranking.

Both scorers earn their keep already: `ranges-valid`, `fences-resolve`, `fences-empty` and
`citations-grounded` catch documents that lie about the change, and they cost nothing to run on every
generation.
