# Skills — Design

## Problem

The repo had 29 skills grown one at a time, with no stated convention for how a
skill is written, when it fires, or how it stays true. Two public skill
collections appeared that had solved parts of this. The question was which of
their skills are worth adopting, which of ours they should improve, and what
conventions we were missing.

## What we surveyed

| Source                                                                                      | Skills read | License |
| ------------------------------------------------------------------------------------------- | ----------- | ------- |
| [cursor/plugins → pstack](https://github.com/cursor/plugins/tree/main/pstack) by Lauren Tan | 44          | MIT     |
| [mattpocock/skills](https://github.com/mattpocock/skills)                                   | 37          | MIT     |

The first pass ranked from frontmatter alone and produced a plausible but wrong
order. Reading the full bodies moved `diagnosing-bugs` to the top and demoted
`how`, two thirds of which is Cursor orchestration around a good output format.
Rank from the body, not the description.

The two collections have different characters. pstack is a set of standalone
tools plus 21 one-page `principle-*` skills; the tools are strong and the
principles duplicate what our Non-negotiables already state, with the weakness
that an on-demand skill is weaker than an always-loaded rule. Matt's is a
connected system: `setup-matt-pocock-skills` wires a tracker, `codebase-design`
supplies vocabulary others reference, `grilling` is an interview engine several
invoke. Cherry-picking from it means cutting those threads deliberately.

## Decisions

### Adopt, ranked

Full ranking and per-skill reasoning is in the session record; the schedule is
in `TASKS.md`. The short version:

1. `diagnosing-bugs`, because our `debugging` skill declares itself mechanics
   only and only UI bugs have a workflow. An ECHO sync bug or a mesh perf
   regression currently has instrumentation and no process.
2. The two `tdd` skills merged, because we have five skills explaining how to
   run test harnesses and none saying where a test belongs or when writing one
   first is worth it. That gap is the inconsistency that prompted this project.
3. `blast-radius`, because moon's dependency graph means a change in
   `@dxos/echo` can break a plugin three hops away and nothing we have asks what
   else breaks.
4. `unslop` and `technical-writing`, both finished and self-contained.
5. `resolving-merge-conflicts`, 14 lines, used weekly by `land` and `submit-pr`.
6. `writing-for-agents`, the theory under the conventions README.

### Reject, and why

Two of these were asserted, not measured, and the assertion about rule placement
is contradicted by our own evidence. See "Open questions" below; the entries are
kept here with that correction rather than deleted, so the reasoning stays
auditable.

- **The 21 `principle-*` skills.** ~~Our Non-negotiables state the ones that
  matter, and always-loaded beats on-demand for rules of that kind.~~
  **Unproven, and probably backwards.** Deferred to Experiment 1.
- **`swarm` and `arena`.** The Workflow tool does this natively.
- **Matt's planning stack** (`triage`, `wayfinder`, `to-spec`, `to-tickets`,
  `domain-modeling`). It pushes state into an issue tracker with blocking edges;
  ours keeps it in committed files with this registry. Running both would be
  worse than either.
- **`recall`, `handoff`, `claude-handoff`.** `/dxos:project hydrate|resume`
  covers it, and ours is more reliable because the state is written down rather
  than reconstructed from chat history.
- **`typescript-best-practices`, `git-guardrails`, `setup-pre-commit`,
  `migrate-to-shoehorn`.** Each duplicates something we have with less
  authority, or adds a dependency to enforce a rule we already state. This one
  holds: our hooks are strictly stricter than `git-guardrails`, and our lint and
  CI cover `setup-pre-commit`.
- **`no-comments`.** ~~Duplicates the `code-style` comment rule.~~ **Withdrawn.**
  It does not duplicate the rule, it _checks_ it: a dedicated reviewer subagent
  hunts violations, where ours only states the rule. Stated and checked are
  different mechanisms. Deferred to Experiment 2.
- **Personal and course material** from both repos.

### Replace nothing wholesale

No skill of ours is superseded by an external one. Everything of ours that
overlaps carries repo mechanics theirs lacks: `debugging` knows the log
pipeline, `browser-e2e-tests` knows our page objects. Every import is net-new or
a graft onto an existing skill.

## Conventions established

Written up in [`.agents/skills/README.md`](../../skills/README.md), with the
theory in the `writing-for-agents` skill.

- **Reference or process, one per skill.** The `debugging` and `debugging-ui`
  pair is the model.
- **`name` matches the directory name.** Five skills disagreed; other skills and
  `AGENTS.md` refer to them by directory name, so the divergence broke linkage
  silently.
- **Gate invocation only when a prose ask should not trigger the skill.** See
  below.
- **Paths must resolve.** `scripts/check-skill-refs.mjs`, with opt-out markers
  for historical records and vendored docs.
- **MEMORY.md is a staging area.** Durable guidance folds into the skill;
  mechanically checkable rules become `.mdl` rule blocks the review harness
  enforces.

### The gating mistake

`disable-model-invocation: true` reads like "do not auto-fire". It is stronger:
per the Claude Code skills documentation it removes the description from the
model's context and the runtime blocks a Skill-tool call, so only a typed
`/<name>` reaches the skill. Gating `submit-pr` therefore made it unreachable by
"open a PR", by the Create PR button (which prompts the model rather than
calling PR machinery directly), and by `AGENTS.md`'s own instruction to use it.
The ask fell through to the generic flow, skipping sync-with-main, `pnpm
format`, the changeset check, and the Composer preview URL.

The rule that came out of it: gate a pure slash-workflow nobody asks for by
accident, never the sanctioned handler for a natural-language ask.

## Compatibility with `AGENTS.md`

Audited after the writing skills landed. The division of labor holds: `unslop`
cedes reply shape to `AGENTS.md` and comments to `code-style`, and
`writing-for-agents` rather than `technical-writing` governs `AGENTS.md` itself,
so the "one document, one Diataxis mode" rule never applies to a file that mixes
modes by design.

One live conflict, fixed in `600f25af`: rule 26 banned "harness" as an abstract
metaphor, but all 28 uses across `AGENTS.md` and the skills name the agent
runtime, and `AGENTS.md` opens by calling itself harness-agnostic. Carved out
alongside `Surface` and `primitive`, which are likewise real names here.

## Open questions, and how to measure them

The survey produced two claims I made without evidence. Both are testable with
the `skill-creator` harness (`/mnt/skills/examples/skill-creator`), which spawns
with-skill and baseline arms in the same turn, grades against objectively
verifiable assertions, uses a **blind** comparator that does not know which arm
produced which output, and aggregates pass rate, time, and tokens with
mean +/- stddev via `scripts/aggregate_benchmark.py`.

### Evidence that prompted the reopening

1. **This repo already measured that always-loaded rules get diluted.** The
   `agent-directives` project found response directives were 6 lines of ~7.2k
   always-loaded tokens (~1.3%), never repeated, while a single skill invocation
   (`composer-plugins/SKILL.md`, 42KB) lands later and therefore outranks them
   positionally. Its recorded direct evidence: "Be as terse as possible" was
   active every turn and ignored every turn. That project's whole fix was moving
   the rule off always-loaded markdown onto the per-turn channel.
2. **Our strongest always-loaded rule is violated at scale.** The no-cast
   Non-negotiable is stated in `AGENTS.md`, repeated in `code-style`, and
   encoded as an `.mdl` rule. In tree today: 1,121 `as any` and 182
   `as unknown as`. One full-project `agentic-review` run
   (`.agents/reviews/50877ea571`) produced 5,230 `no-casts` ERROR findings.
3. **We already act as though stating is insufficient.** The no-cast rule ships
   with a pre-commit audit command, and `agentic-review` exists at all, because
   prose rules do not enforce themselves.

The corrected model has three positions, not two: per-turn re-injected beats
loaded-on-demand-at-the-point-of-need, which beats loaded-once-at-session-start.
pstack's `principle-*` skills sit in the middle tier. That is plausibly _better_
placed than a Non-negotiables bullet for the same rule, which is the opposite of
what the rejection assumed.

### Experiment 1: does rule placement change violation rate?

- **Task set.** 8 to 12 coding tasks that tempt one specific violation each: a
  type error easiest to silence with a cast, a test that wants a sleep, a moved
  module that invites a compat shim.
- **Arms.** (a) `AGENTS.md` as-is; (b) plus the matching `principle-*` skill
  on demand; (c) principle skill only; (d) rule re-injected per turn by hook.
- **Metric.** Violations in the produced diff, counted by the detector we
  already own: the `.mdl` rules plus grep. Mechanical, not LLM-judged.
- **Decides.** Whether to adopt `principle-*` skills, move Non-negotiables onto
  the per-turn channel, or leave both alone.

### Experiment 2: stated rule versus checked rule

- **Task set.** 6 to 8 tasks that produce commentable code.
- **Arms.** (a) `code-style` comment rule alone; (b) plus a `no-comments`-style
  reviewer pass.
- **Metric.** Comments in the final diff that restate the code, graded by the
  grader agent; plus how many the reviewer pass removed. Partly judged, so run
  the blind comparator too.
- **Decides.** Whether the reviewer-subagent mechanism is worth adopting for the
  comment rule, and by extension for other stated-only rules.

### Experiment 3: triggering accuracy of our existing descriptions

`scripts/improve_description.py` measures whether a skill fires when it should.
Run it across our 32 skills. Purely mechanical, and it grades the convention
this project already wrote down ("description is the trigger").

### Experiment 1 outcome (runs 1 and 2)

Run 1 was inconclusive (floor effect). Run 2 answered it: **rule placement has no
measurable effect on violation rate; task context has a large one.** Extending a
file that already contains casts produced violations in 92% of runs regardless of
arm, and our Non-negotiable reproduced the local cast style verbatim. A
deadline-framed task produced 70%. Naming the error produced 0%.

So the `principle-*` rejection is settled for the wrong reason: not because
always-loaded wins, but because neither placement wins. Both our terse rule and
their principle skill lost to the surrounding code. Adopt principle skills only
on a motivation other than enforcement.

The `no-comments` question (Experiment 2, stated versus checked) is untouched by
this and stays open. Run 2's finding makes it more interesting, not less: if
prose cannot beat local style, a mechanical check may be the only thing that can.

Details and limitations: `experiments/rule-placement/run2/RESULTS.md`.

### Experiment 1 was asking the wrong question

Arm C delivered the principle skill's text directly into the prompt, so it held
the same tokens in the same context as arm A's always-loaded rule. If a skill
always loads, "in a skill" and "in `AGENTS.md`" are the same thing, and the
comparison could only ever come out null. **Triggering probability is the only
variable that separates an on-demand skill from an always-loaded rule.**

### Experiment 3 outcome: triggering is where we actually fail

92 runs measuring real `Skill` invocations. 73% of positive cases fired the
expected skill, but the distribution is bimodal, and the low group is almost
exactly the set written or rewritten in this session: `moon` 1/6,
`writing-for-agents` 1/6, `unslop` 2/6, `technical-writing` 3/6, against 3/3 or
6/6 for fourteen pre-existing skills. The failing descriptions open with the
author's abstraction rather than the user's symptom, spend their tails on
cross-references that do no triggering work, and in one case compete with a
built-in. This is a defect in work done this session, and it is fixable by
rewriting descriptions, not by moving content between files.

The negative controls also confirm the gating rule empirically: neither
`agentic-review` nor `migrate-oxfmt` fired from a prose ask, exactly as
`disable-model-invocation` is documented to behave.

Details: `experiments/triggering/RESULTS.md`.

### Descriptions are always loaded; only bodies are conditional

A correction that changes the factoring calculus. A skill's **description sits in
context on every turn** exactly like an `AGENTS.md` line; only the body loads
conditionally. So factoring a rule out keeps a short always-on directive in place
and moves the detail behind it, which is the composability win at near-zero cost.
The exposure is only that the detail arrives conditionally.

### Experiment 5: factoring cost nothing, but nothing failed

Against a real scratch monorepo with 14 importers and real file tools, a
Non-negotiable moved from `CLAUDE.md` into a self-triggering skill performed
identically to leaving it in place, and the skill fired 4/4 on work that never
names the rule. The control, given no rule at all, also succeeded 5/5, so the
task could not have detected a cost.

The finding underneath is more useful than the placement answer: migrating 14
files across 5 packages is trivial for an agent, so the intuition the rule guards
against (leaving a shim because touching every caller is expensive) is a human
one that does not transfer. Before asking whether a Non-negotiable can be
factored out, ask whether it still earns its place.

Details: `experiments/factoring-out/RESULTS.md`.

### The protocol we should have used from the start

Testing where a rule lives is meaningless until the rule is shown to do
something. The order is: find a scenario where the control fails, show the
`CLAUDE.md` bullet fixes it, and only then ask whether a self-triggering skill
matches. Experiments 1, 4 and 5 all skipped to the last step and could not have
produced an answer.

### Experiment 6: the no-cast Non-negotiable does not work

Applying that protocol to the one scenario with a failing baseline (adding a
function to a cast-dense file, real fixture, real tools): the control violated
8/8, and the rule as a `CLAUDE.md` bullet also violated 8/8. Fisher p = 1.0. The
wording was strengthened to name this exact failure ("matching a file's existing
style is not a reason to add another one") and still changed nothing.

So 1,121 `as any` in tree and 5,230 `no-casts` review findings are not an
instruction being occasionally ignored. They are what a rule with no effect looks
like. The placement question cannot be asked of this rule, because there is
nothing to preserve or lose by moving it.

This makes Experiment 2, stated rule versus mechanically checked rule, the only
remaining untested lever, and the one most likely to find something that works.

Details: `experiments/does-the-rule-work/RESULTS.md`.

## Deferred frictions

Left open deliberately. The rules are scoped to prose we write or substantially
rewrite, so nothing violates anything today, but we ship rules most of our
documents do not follow.

| Friction                       | Count                                                        | Options                                                                |
| ------------------------------ | ------------------------------------------------------------ | ---------------------------------------------------------------------- |
| Em dashes                      | 48 in `AGENTS.md`, 1,103 in other skills, 0 in the new three | leave and let edits converge; sweep `AGENTS.md` only; sweep everything |
| Negation over positive framing | 34 in `AGENTS.md`                                            | leave; invert the few Non-negotiables that carry no positive target    |
| Semicolons                     | 17 in `AGENTS.md`                                            | leave; fold into an `AGENTS.md` pass if one happens                    |

Recommendation: leave all three. A sweep churns text nobody is otherwise
editing, which costs review attention and buries real diffs, and the scoping
already prevents a contradiction. Revisit if `AGENTS.md` gets a substantive
rewrite for another reason, and fold the pass into that.
