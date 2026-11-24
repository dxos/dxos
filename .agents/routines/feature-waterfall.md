# Routine: feature waterfall — carry a feature map change down to working code

A Claude Code cloud Routine (or a one-off agent) that takes a change to `FEATURES.mdl` — a new
feature, or a changed one — and carries it through spec, review, tasks and code to a verified result,
one commit per layer. The procedure is the `feature-waterfall` skill; this file is the trigger.

| Mode   | When                                   | Selection                                                                      |
| ------ | -------------------------------------- | ------------------------------------------------------------------------------ |
| change | after a PR that touches `FEATURES.mdl` | features added or changed relative to the base                                 |
| named  | by hand, with `feature <id>` appended  | that feature                                                                   |
| drift  | weekly                                 | the first feature whose authored status `deus features check` does not support |

## Trigger configuration

- **Environment:** the repository's cloud environment (setup command `bash .config/claude-code-setup.sh`).
- **Outcome:** one PR per feature, `<scope>: <feature id>`, with one commit per layer.
- **Prompt:** the block below, verbatim.

---

```text
Carry a feature map change down to working code. Work autonomously — nobody is watching, so do not ask
questions; when a judgement is needed, make it, record it as an agent: decision in the spec or map
changelog, and move on.

Read, in order: AGENTS.md, .agents/skills/cloud-sandbox/SKILL.md if CLAUDE_CODE_REMOTE is set,
.agents/skills/feature-waterfall/SKILL.md (the procedure — follow it exactly),
packages/reflect/deus/lang/features.mdl, and the mdl and spec-review skills it points to.

Select the feature: if this message names one (`feature <id>`), take it; otherwise take the features
`git diff origin/main -- FEATURES.mdl` adds or changes; if there are none, take the first feature
`pnpm deus features check` warns is marked a status its reviews do not support. Nothing to do →
reply "nothing to cascade" and stop.

Run the five layers for one feature, one commit per layer, each layer's check passing before its commit.
Report the layer table and the feature's `deus features check` row before and after.
```
