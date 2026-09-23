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
| fences-authentic       | 100    | 100    | 100    | 100    |
| hunk-coverage          | 75     | 88     | 74     | 67     |
| generated-ignored      | 100    | 100    | 100    | 100    |
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

Five dimensions move: sentence length, coverage, range validity, citations-grounded (98 on v3) and
prose-density (92 on v2). The other eight sit at 100 for every variant, which makes them guardrails
rather than a comparison — worth keeping, because a regression on any of them is a document that
lies, but they say nothing about which prompt is better.

The reader rules did the one thing they were written to do: long sentences fell from 23% of the
corpus to 5%.

Coverage here is the scorer's second definition, derived from the fences above `## Also changed`
rather than from `fillWalkthrough`. The rewrite moved v1 from 79 to 75 and v4 from 70 to 67; it did
not change which variant leads.

Coverage moved the other way by design. `v3` and `v4` are told to fence a repeated mechanical change
once, so on the nineteen-file PR they emit two fences where `v2` emits fourteen. The unclaimed hunks
still reach the reader through the appended `## Also changed` section. This is the tension the design
doc names: maximising coverage produces the diff again.

## Large pull requests: one prompt is not enough

The corpus above tops out at nineteen files. Run the generator on a 263 KB, 31-file change
(dxos/dxos#13288, a SQLite query executor) and the one-shot path fails in a specific way: it writes
the first sections in full, runs out of room, and leaves the rest to the appended `## Also changed`
section. The reader gets a walkthrough of the first tenth of the pull request and a diff dump for
the other nine.

`plan.ts` adds a two-stage path for diffs over 32 KB. A planner sees the file list and their sizes,
never their contents, and returns chapters: a title, a one-sentence brief, and the files that belong
to each. Each chapter is then narrated against its own files only, and the chapters are concatenated
under the planner's title. Generated files never reach the planner, so a lockfile cannot become a
chapter.

Measured on #13288 with `claude-sonnet-5`, the model the operation pins:

| run                      | calls | tokens | hunk coverage | sentence length | correctness | readability |    judge |
| ------------------------ | ----: | -----: | ------------: | --------------: | ----------: | ----------: | -------: |
| one-shot                 |     1 |    14k |           15% |              73 |          88 |          95 |     2.75 |
| chaptered, first prompt  |     6 |   122k |           31% |              21 |          91 |          84 |     3.25 |
| chaptered, second prompt |     6 |   132k |       **71%** |              76 |          96 |          93 | **4.00** |

The first chaptered prompt bought coverage and lost the prose: chapter writers wrote 30-word
sentences stitched with semicolons, and `sentence-length` fell to 21. Two lines fixed both halves.
A completeness bar — "every file listed in your chapter appears in at least one fence" — took
coverage from 31% to 71%. Promoting the sentence rule to the top of the chapter prompt, stated as a
ban on semicolons and dashes carrying a second clause, took `sentence-length` back to 76.

The cost is nine times the tokens for six calls instead of one. That buys a document covering 71% of
a change the single call covered 15% of, and the blind judge ranked it 4.00 against 2.75.

## Generated files

A lockfile is the largest hunk in most pull requests and the one nobody reads. `generated.ts`
detects them by path and by patch shape: lockfiles by name, `dist/`-style directories, minified
bundles, source maps, snapshots, generated protobuf and codegen suffixes, binary extensions, and
anything git wrote as `Binary files … differ`. Changesets count too, since a changeset is a
consequence of the change the walkthrough already describes.

Three places use it. The prompt drops generated files before it drops anything else, so a lockfile
never pushes code out of the budget. `fillWalkthrough` names them in the appendix rather than
rendering their hunks, so the tail of the document stays readable. And `generated-ignored` scores a
fence pointing at one, because prose spent on machine output is the reader's time spent on nothing.

## Judge scores

Blind: variants copied under opaque letters, key withheld. Mean of order, why, load and trust, 1-5.

The judge runs through the Anthropic API on `claude-opus-5` (`scripts/judge-walkthrough.ts`, one
request per fixture so the rubric's ranking has something to rank against, structured outputs for
the verdict). Grading all four variants of the small corpus in one pass:

| fixture              | v1   | v2       | v3   | v4   |
| -------------------- | ---- | -------- | ---- | ---- |
| 13115 one-line bump  | 3.50 | 4.00     | 3.75 | 3.00 |
| 13149 eight files    | 4.25 | 4.75     | 4.00 | 3.75 |
| 13150 nineteen files | 3.00 | 4.25     | 3.50 | 4.00 |
| 13153 bug fix        | 3.25 | 3.75     | 5.00 | 4.75 |
| mean                 | 3.50 | **4.19** | 4.06 | 3.88 |

v1 scores 2.50 on trust, at least a point and a quarter below every other variant, which is the same finding the
subagent rounds reported: the baseline earns its "why" by asserting motives the diff cannot support.

The earlier rounds below were graded by Claude Code subagents rather than by an API call, before the
judge script existed. They are kept because the variance between them is itself a result — and
because the round-two subagent verdict that put `v4` ahead is the one the API judge later
overturned.

Subagent round one, all three variants per packet:

| fixture              | v1   | v2   | v3   |
| -------------------- | ---- | ---- | ---- |
| 13115 one-line bump  | 4.50 | 3.75 | 4.00 |
| 13149 eight files    | 4.50 | 5.00 | 3.75 |
| 13150 nineteen files | 3.25 | 4.75 | 4.00 |
| 13153 bug fix        | 4.25 | 4.25 | 4.50 |
| mean                 | 4.13 | 4.44 | 4.06 |

Subagent round two, `v2` against `v4`:

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
- **Scoring a stored walkthrough with the first scorer.** It graded raw model output only: a stored
  body has its fences filled from the patch and an appendix listing everything the prose missed, so
  the scorer read filled fences as invented content and the appendix as full coverage. Coverage is
  now derived from the fences above `## Also changed`, and fence content counts as authentic when
  its lines come from the patch.
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

`v2-readable` ships, and it is already what `SYSTEM_PROMPT` carries. An earlier draft of this
document recommended `v4-evidence` on a subagent round; the API judge overturned that, first in the
four-way run and then decisively head to head.

| fixture              |       v2 |   v4 |
| -------------------- | -------: | ---: |
| 13115 one-line bump  | **3.75** | 2.75 |
| 13149 eight files    | **4.50** | 3.25 |
| 13150 nineteen files | **3.75** | 3.25 |
| 13153 bug fix        |     3.75 | 3.75 |
| mean                 | **3.94** | 3.25 |

v4 loses on trust, 2.75 against 3.75 — the lowest number any variant scored on any dimension. The
reason is the rule that was supposed to earn the "why" honestly. Told to mine unchanged context for
evidence, the model quotes a real constant and then reasons past it: on the retry fixture it cites
the true 10-second timeout and 3-second poll interval, then infers that five retries "fit" inside
that window, which the patch does not support and which the judge called arguably backwards. A
confident inference resting on a real number is harder for a reviewer to catch than an invented
number, so the rule made the failure worse rather than better.

The lesson generalises past this prompt: asking for richer justification buys invention unless the
ask is bounded by what the diff can support. `v2`'s plainer instruction — say the mechanism, and
stop where the diff stops — produces less and is trusted more.

Both scorers earn their keep already: `ranges-valid`, `fences-resolve`, `fences-authentic` and
`citations-grounded` catch documents that lie about the change, and they cost nothing to run on every
generation.
