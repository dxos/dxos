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

- **The 21 `principle-*` skills.** Our Non-negotiables state the ones that
  matter, and always-loaded beats on-demand for rules of that kind.
- **`swarm` and `arena`.** The Workflow tool does this natively.
- **Matt's planning stack** (`triage`, `wayfinder`, `to-spec`, `to-tickets`,
  `domain-modeling`). It pushes state into an issue tracker with blocking edges;
  ours keeps it in committed files with this registry. Running both would be
  worse than either.
- **`recall`, `handoff`, `claude-handoff`.** `/dxos:project hydrate|resume`
  covers it, and ours is more reliable because the state is written down rather
  than reconstructed from chat history.
- **`typescript-best-practices`, `no-comments`, `git-guardrails`,
  `setup-pre-commit`, `migrate-to-shoehorn`.** Each duplicates something we have
  with less authority, or adds a dependency to enforce a rule we already state.
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
