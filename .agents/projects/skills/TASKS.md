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

- [ ] **Experiment 1: rule placement.** 8 to 12 tasks that each tempt one
      violation; arms are always-loaded, plus-principle-skill, principle-only,
      and per-turn re-injected. Metric is violations in the diff, counted by our
      existing `.mdl` rules and grep, so the assertion is mechanical. Decides
      whether to adopt `principle-*` skills or move Non-negotiables onto the
      per-turn channel.
- [ ] **Experiment 2: stated versus checked.** `code-style` comment rule alone
      against the rule plus a `no-comments`-style reviewer pass. Decides whether
      the reviewer-subagent mechanism is worth adopting for stated-only rules.
- [ ] **Experiment 3: triggering accuracy.** Run
      `scripts/improve_description.py` across all 32 skill descriptions.
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
