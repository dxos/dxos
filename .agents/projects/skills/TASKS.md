# Skills — Tasks

Branch: `claude/repo-skills-table-6gfvik`. No PR yet.

## Phase 0: Hygiene and conventions (done)

Commit `97786e3c`, corrected by `32adf31a`. Survey of two external skill
collections turned up rot and missing conventions in our own tree before any
import was worth doing.

### Tasks

- [x] **Gate side-effectful slash workflows** with `disable-model-invocation`
      (`agentic-review`, `migrate-oxfmt`), plus `argument-hint` where the skill
      takes arguments.
- [x] **Ungate `submit-pr` and `land`** (`32adf31a`). The flag also strips the
      description from the model's context and hard-blocks Skill-tool calls, so
      a prose ask and the Create PR button both fell through to the generic
      flow, contradicting the `AGENTS.md` mandate to use those skills. Gating my
      own first pass was the mistake; the rule now lives in the skills README.
- [x] **Align frontmatter `name` with directory name** for five skills
      (`code-style`, `echo`, `operations`, `skills`, `subduction`).
- [x] **Fix stale `.cursor/skills/` paths** in `echo` and `skills`.
- [x] **Add `scripts/check-skill-refs.mjs`** and fix everything it found. First
      run flagged 165 references; the real rot included the `echo-db` to
      `echo-client` package rename, the `assistant-toolkit` move under
      `compute/`, `functions-runtime` becoming `compute-runtime`, a deleted
      `semantic.css`, and two deleted exemplar directories in `operations`.
- [x] **Wire the MEMORY.md to `.mdl` promotion path** and promote the first
      rule (`no-capability-hooks-in-components`).
- [x] **Add the spec-conformance axis** to `agentic-review` as an optional
      second pass.
- [x] **Rewrite `moon` and `proto`** around this repo's setup instead of the
      upstream tool pitch.
- [x] **Write `.agents/skills/README.md`** with the settled conventions.

## Phase 1: Writing skills (in progress)

Commits `4749db18` and `600f25af`. Prose we ship gets the same treatment as the
code, and these three land first because every later import is a writing job.

### Tasks

- [x] **`unslop`** (from pstack, MIT). Scoped to prose we write or substantially
      rewrite; defers to `AGENTS.md` for reply shape and `code-style` for
      comments.
- [x] **`technical-writing`** (from pstack, MIT). Diataxis, Google developer
      style, STE, Global English, plus a table mapping the four modes to our
      document types and a worked example built from our own `pnpm format` and
      `oxfmt --check` rule.
- [x] **`writing-for-agents`** (from mattpocock/skills, MIT). Its
      `SKILL-MECHANICS.md` is rewritten against Claude Code frontmatter
      semantics and records the `submit-pr` gating case.
- [x] **Attribution.** `.agents/skills/THIRD-PARTY.md` carries both MIT notices
      verbatim, verified byte-for-byte against the source `LICENSE` files.
- [x] **Compatibility audit against `AGENTS.md`.** Found one live conflict:
      rule 26 banned "harness" as a metaphor, but all 28 uses across
      `AGENTS.md` and the skills mean the agent runtime. Carved out in
      `600f25af` alongside `Surface` and `primitive`.
- [ ] **`diagnosing`** (from Matt's `diagnosing-bugs`). The highest-value import
      of the whole survey. Port the feedback-loop-first workflow with our
      instrumentation: `@dxos/log`, `query-logs.mjs`, the `[DEBUG-xxxx]` tag
      idiom for one-grep cleanup. Must cross-link with `debugging` (mechanics)
      and `debugging-ui` (UI workflow) rather than duplicating either.
- [ ] **`test-strategy`** (merge of Matt's and pstack's `tdd`). Matt's doctrine
      (seams agreed up front, the anti-pattern catalog, vertical slices) plus
      pstack's gate (when TDD is not worth it, prefer no test over a bad test,
      report failing-before and passing-after evidence). Sits above our five
      harness references, which keep owning their harnesses.
- [ ] **`blast-radius`** (from pstack). Find the one fact a change is safe
      because of and prove it by running code; the proof ladder is the value.
      Swap the arena step for our Workflow tool.
- [ ] **`merge-conflicts`** (from Matt). 14 lines, no dependencies. `land` and
      `submit-pr` both delegate to it.
- [ ] **Cross-link the new skills** from `debugging`, `debugging-ui`,
      `code-style`, and the four testing skills once Phase 1 lands.

## Phase 2: Design and review imports

- [ ] **`codebase-design`** (from Matt). Deep-module vocabulary: module,
      interface, seam, adapter, depth as leverage, the deletion test. Lands
      after `test-strategy`, which references it for seam placement.
- [ ] **Fowler smell baseline into `agentic-review`** as
      `rules/code-smells.mdl`. Matt's twelve smells are already close to our
      rule-block shape; repo standards override, every smell is a judgment call.
- [ ] **Lead-judgment buckets** (Act on / Consider / Noted / Dismissed) in the
      `agentic-review` report step, from pstack's `interrogate`.
- [ ] **`wizard`** (from Matt). Port `template.sh` and the skill; reference it
      from the `AGENTS.md` credential-handling section, which currently hands
      the user a list of manual steps.
- [ ] **`how` (slim)** (from pstack). Keep the output format and complexity
      triage; drop the Cursor orchestration and let our Explore agents do the
      legwork.
- [ ] **Feature map for `browser-e2e-tests`**, the durable idea inside pstack's
      `create-verification-skill`: one file per user-facing feature saying how
      to reach it, how to drive it, and what observable state proves it works.

## Phase 3: `why` port

- [ ] **Port pstack's `why`** as its own project. Seven evidence categories
      queried in parallel, null results as first-class evidence, strict
      found/inferred/unknown separation, a Sources Consulted coverage map. The
      port is a rewrite onto our roster (git, the GitHub MCP tools, Linear,
      PostHog, SigNoz) driven by the Workflow tool, plus five reference prompt
      files. Highest value per the survey, highest port cost.

## Phase 1.5: Measure the two open questions

Both rejections below were asserted, not measured, and the first is contradicted
by our own `agent-directives` findings and by 5,230 `no-casts` review findings
against an always-loaded rule. Harness: `skill-creator`
(`/mnt/skills/examples/skill-creator`), with-skill versus baseline arms, blind
comparator, `aggregate_benchmark.py` for pass rate, time, tokens with variance.
Designs in `DESIGN.md`.

### Tasks

- [x] **Experiment 1 run 1: rule placement.** INCONCLUSIVE. 65 runs, 5 arms
      (control, ours-always-loaded, both, theirs-on-demand, ours-re-injected),
      3 violation classes. Result: 3 violations in 65 runs, no arm separates
      from the control. The tasks do not discriminate, so nothing can be
      concluded either way. A detector bug (flagging narrowing casts inside type
      guards) inflated the first pass to 14-36% and would have supported a
      confident wrong answer. Harness, tasks, scorer and full writeup in
      `experiments/rule-placement/`.
- [x] **Experiment 1 run 2.** ANSWERED. 48 runs, 96 calls, two-turn sessions on
      real `@dxos/echo` code. **Rule placement has no measurable effect** (every
      pairwise Fisher test null; only a ~42 point swing would have been
      detectable at n=12/arm, so a large effect is ruled out and a small one is
      not). **Task context has a large, significant one**: extending a file that
      already contains casts violates 92% of the time and a deadline-framed move
      70%, against 0% when the error is simply named. Writeup in
      `experiments/rule-placement/run2/RESULTS.md`.
- [ ] **Follow-up A: does cleaning the code change the rate?** Re-run the `r2`
      local-style task against a cleaned `atoms.ts`. If the rate drops, the
      leverage is in the tree, not in `AGENTS.md`, and the cast backlog becomes a
      correctness project rather than a tidiness one.
- [ ] **Follow-up B: urgency framing.** 70% violation under deadline pressure,
      and `submit-pr` and `land` both run under exactly that framing. Test
      whether an explicit "no shortcuts under time pressure" line in those two
      skills moves it.
- [x] **Experiment 4 (invalid) and Experiment 5 (real repo).** Experiment 4's
      detector produced 13 violations of which all 13 were false positives (a
      regex on `re-export` firing on "no re-export shim left"), and its runs had
      no file tools so no arm could complete the task. Rebuilt as Experiment 5
      against a real scratch monorepo with 14 importers and real tools:
      **factoring the rule into a skill cost nothing (B 4/4 clean = A 5/5 = E
      5/5) and the skill self-triggered 4/4** on work that never names the rule.
      The control also succeeded, so no cost could have been detected. Writeup in
      `experiments/factoring-out/`.
- [ ] **Does the no-shim rule still earn its place?** The control arm, told
      nothing and told the release was cut in forty minutes, migrated all 14
      callers anyway. Migrating files is cheap for an agent, so the human
      intuition the rule guards against may not transfer. Run 2's 70% figure for
      this scenario was measured without tools and with the broken regex, so it
      was artifact. Worth auditing the other Non-negotiables the same way before
      moving any of them.
- [ ] **Find a task where the rule actually bites.** Every discriminating signal
      so far turned out to be scorer artifact. Until a scenario exists where the
      control genuinely fails, no placement question about this rule can be
      answered.
- [ ] **Close out the `principle-*` question.** Run 2 rules out a large win for
      either our Non-negotiables or their principle skills; both failed the
      local-style task. Adopt principle skills only if a cheaper motivation than
      violation rate appears (e.g. they teach, rather than enforce).
- [ ] **Experiment 2: stated versus checked.** `code-style` comment rule alone
      against the rule plus a `no-comments`-style reviewer pass. Decides whether
      the reviewer-subagent mechanism is worth adopting for stated-only rules.
- [x] **Experiment 3: triggering accuracy.** DONE, and it is the experiment that
      mattered. 92 runs measuring whether the `Skill` tool actually fires on
      naturalistic prompts that avoid each description's own wording. Overall
      65/89 positives (73%), but bimodal: most skills 3/3, while the four I
      wrote or rewrote this session are the worst in the repo (`moon` 1/6,
      `writing-for-agents` 1/6, `unslop` 2/6, `technical-writing` 3/6). Negative
      controls all clean, which empirically confirms that gated skills are
      unreachable from a prose ask. Writeup in `experiments/triggering/`.
- [ ] **Rewrite the four failing descriptions** to lead with the symptom a user
      would actually type, drop the cross-reference tails, and re-measure with
      the same harness. Target 5/6.
- [ ] **Fix two mislabelled cases** (`testing-assistant-conversations` lost to
      the more specific `regenerate-model-fixture`, which was correct routing;
      `agent-eval-tests` likely the same) and re-run them.
- [x] **Coverage gap partly closed** (103/123). Ungating is now validated
      empirically: "Open a PR for it" fires `submit-pr` 2/3, "Get PR 12688
      merged" fires `land` 1/1, while the two still-gated skills fire 0 times
      from equivalent prose. `submit-pr` at 2/3 joins the rewrite list.
      `trunk-quarantine` at 1/3 shows the low group is not only this session's
      work. Still unmeasured: `task-planning`, `cloud-sandbox`, `skills`.
- [ ] **Add trigger measurement to the authoring convention.** A new skill is
      not done until its description fires on prompts that avoid its own wording.
- [ ] **Re-examine the other rejections** once a method exists. `swarm`/`arena` versus
      the Workflow tool is measurable the same way.

## Deferred: style frictions

Documented, not scheduled. The `unslop` and `technical-writing` rules are scoped
to prose we write or substantially rewrite, so none of these is an active
contradiction today. Each resolves on its own as documents get edited. Full
options in `DESIGN.md`.

- [ ] **Em dashes.** 48 in `AGENTS.md`, 1,103 across the other skills, zero in
      the three new ones. We now ship a rule most of our documents do not follow.
- [ ] **Negation.** 34 never/do-not constructions in `AGENTS.md` against
      `writing-for-agents`' "prompt the positive". Coherent as written, since
      that skill allows hard guardrails and the Non-negotiables are that case,
      but several bullets would read stronger leading with the positive target
      the way the cast rule already does.
- [ ] **Semicolons.** 17 in `AGENTS.md` against Global English's "use periods".
      Cosmetic.

## Backlog

- [ ] **Run `check-skill-refs.mjs` in CI**, or as an `.mdl` rule, so path rot
      fails a check instead of waiting for the next audit.
- [ ] **Promote more MEMORY.md entries.** `composer-plugins/MEMORY.md` is 680
      lines; one rule is promoted so far.
- [ ] **Re-survey upstream.** Both sources are active repos. Our copies are
      adaptations, not vendored, so upstream fixes need reading rather than
      merging.
