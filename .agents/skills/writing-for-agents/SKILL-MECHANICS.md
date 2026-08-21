# Skill mechanics

The skill-specific branch of [`writing-for-agents`](SKILL.md): what changes when the document is a skill. Everything else about writing it is the universal reference in `SKILL.md`, and the settled house rules are in [`../README.md`](../README.md).

Adapted from [mattpocock/skills](https://github.com/mattpocock/skills) by Matt Pocock, MIT licensed, and rewritten against Claude Code's frontmatter semantics.

## Frontmatter

| Field                            | Effect                                                                               |
| -------------------------------- | ------------------------------------------------------------------------------------ |
| `name`                           | The skill's identity and its `/<name>` command. Must match the directory name.       |
| `description`                    | The top-level context pointer. Written for the model, carrying the trigger branches. |
| `disable-model-invocation: true` | Only a person can invoke the skill.                                                  |
| `user-invocable: false`          | Only the model can invoke the skill.                                                 |
| `argument-hint`                  | Shown beside the slash command; add it when the skill takes arguments.               |

## Invocation

Three states, trading the two loads:

- **Both (the default, no flag).** The agent can fire it autonomously, other skills can reach it, and a person can type `/<name>`. The description stays loaded on every turn: permanent context load in exchange for discoverability. This is the right default for reference skills and for any process that answers a natural-language ask.
- **User-only (`disable-model-invocation: true`).** Only a person typing `/<name>` can invoke it. The description is stripped from the model's context and the runtime blocks a Skill-tool call, so no other skill can reach it either. Zero context load, paid for in cognitive load: you become the index that must remember it exists.
- **Model-only (`user-invocable: false`).** The description stays in context and the agent can fire it, but there is no slash command. Use for shared reference another skill reaches and a person never types.

Gating is stronger than "don't auto-fire", and that is the trap. A user-only skill is unreachable by a prose ask ("open a PR", "run the review") **and** by any UI affordance that works by prompting the model, such as the Create PR button. If a skill is the sanctioned handler for something a person will ask for in words, gating it means the ask silently falls through to the generic behaviour. We learned that on `submit-pr`: gated, it could not answer the request that `AGENTS.md` mandates it for.

So: gate a pure slash-workflow nobody asks for by accident (`agentic-review`, `migrate-oxfmt`). Leave everything else model-invocable and let the description do the triggering work.

Shared reference that two user-only skills both need can live in neither: with no descriptions, neither can fire the other. Push it to a plain file both point at.

## Splitting by invocation

The invocation cut of splitting (the sequence cut lives in `SKILL.md`): split off a separate model-invoked skill when you have a distinct leading word that should trigger it on its own, or when another skill must reach it independently. You pay context load for the new always-loaded description, so that independent reach has to be worth it.

Our reference-versus-process split is usually this cut already made: `debugging` (mechanics) and `debugging-ui` (workflow) are separately reachable because the workflow calls the mechanics, and a session can need either alone.

## Progressive disclosure inside a skill

A skill directory is the natural home for the third rung of the hierarchy. Sibling files (`DOCTOR.md`, `MEMORY.md`, `references/*.md`) load only when the body points at them. Every such pointer must resolve: `node scripts/check-skill-refs.mjs` fails on a dead one.
