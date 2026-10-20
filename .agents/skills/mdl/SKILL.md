---
name: mdl
description: >-
  Write and edit `.mdl` specs (Deus) — `PLUGIN.mdl`, `SPEC.mdl`, `spec/APP.mdl` — and record
  a decision in the spec's `## Changelog` for every change, attributed to the person (`user:`) or
  agent (`agent:`) that made it. Use when creating or changing a `.mdl` file, adding a block type to one, when a
  person or you settle a design question a spec should carry, when asked who decided something in a
  spec, or when asked to add or review a changelog entry. For running a spec's `## QA` tests use
  `composer-qa`; for `rule` blocks and the review harness use `agentic-review`.
---

# MDL specs

A `.mdl` file is the authoritative description of a component: Markdown prose plus typed
` ```mdl ` blocks. The language lives in `packages/reflect/deus`:

| File                               | What it defines                                                      |
| ---------------------------------- | -------------------------------------------------------------------- |
| `lang/core.mdl`                    | Document format, block syntax, the `ext` primitive                   |
| `docs/DESIGN.md` §Standard Dialect | `type`, `op`, `feat`/`req`, `scenario`, `component`, `service`, `db` |
| `lang/app.mdl`                     | `node`, `deck`, `plank`, `companion`, `surface`, `menu`              |
| `lang/qa.mdl`                      | `test`, `step`, `suite` — executable QA                              |
| `lang/changelog.mdl`               | `decision` — the attributed changelog                                |
| `lang/PLUGIN-.template.mdl`        | Starting point for a new `PLUGIN.mdl`                                |

Read the dialect file before you use one of its blocks. Copy `ext` definitions from `lang/`; do not
invent fields.

## Editing a spec

1. **Declare every block type you use** in the document's `## Extensions` table, with the URI from
   its dialect file. A block type missing from the table is a lint error.
2. **Keep the body current and the reasons in the changelog.** The body states what is true now.
   Do not leave "previously…" or "changed from…" prose in it; that history belongs in a
   `decision` entry.
3. **The code is the truth about what exists; the spec is the truth about why.** When code and spec
   disagree on structure, follow `agents/routines/spec-sync.md`. When they disagree on intent, ask.
4. **Cross-reference by id** — `[F-2.1]`, `type:Scene`, `op:Name` — never by prose paraphrase.

## The changelog

A spec's `## Changelog` is an append-only log of every decision that changed it. Its purpose is to
trace how the spec came to say what it says, and to keep what people decided apart from what
agents decided. The dialect and its rules are in `lang/changelog.mdl`; read them once.

**Every change to a spec adds at least one decision, in the same commit.** That includes renames,
reworded requirements and spec-sync reconciliation. CI rejects a changed spec with no new entry
(see [Checking your work](#checking-your-work)). If the spec has no `## Changelog` yet, add one as
the last section before any appendix, and add `decision` to its Extensions table:

```
| `decision` | `org.dxos.mdl.decision@1.0` |
```

### Separate the person's knowledge from yours

A person usually gives coarse direction and you fill in the gaps. Never merge the two into one
entry. Record them in this order:

1. **First, what the person said: faithfully, and nothing more.** One `by: user:<them>` entry per
   instruction. The prose restates their decision in spec terms. `quote:` carries their words
   verbatim. `context:` may add facts that make the entry readable on its own, such as what a name
   refers to or where they said it. Do not add requirements, rationale they did not give, or
   assumptions. If you had to interpret something, the interpretation goes in step 2. `source:`
   links to where they said it, when there is a link.
2. **Then, what you added: as separate entries.** One `by: agent:claude-code` entry per independent
   choice you made to fill the gaps (a shape, a name, an edge case, your reading of an ambiguous
   phrase). Each one names your principal in `for:` and the entry it builds on in its prose
   (`Fills in [D-1].`). Put the reasoning in `why:` and the alternatives you dropped in `rejected:`.
3. **A person approving your entries is a new decision, by them.** When they accept your design,
   append a `user:` entry such as `Approve [D-2] and [D-3].` When they accept it with changes,
   record the changes as their decision, with `supersedes:` where it replaces one of yours. Never
   edit your own entry to say it was approved.

```mdl
decision D-1: The canvas grows to fit its content.
  date: 2026-10-20
  by: user:alice
  quote: "canvas should just grow when stuff goes past the edge"
  context: "The canvas" is the `Scene` surface.
  affects: [Scene]
```

```mdl
decision D-2: Bounds grow to the major grid. Fills in [D-1].
  date: 2026-10-20
  by: agent:claude-code
  for: user:alice
  affects: [Scene, F-2.1]
  why: Growing to the minor grid re-lays the canvas on every drag step.
```

```mdl
decision D-3: Approve [D-2].
  date: 2026-10-21
  by: user:alice
```

### Attribution rules

- **The decider is who chose, not who typed.** You write most entries; a `user:` entry records a
  choice the person made.
- **Your agent name is the harness, never the model.** Use `agent:claude-code` in this repo.
  Models change mid-session; the name must not.
- **Handles.** Use the person's GitHub username, or their email when that is all you have. Do not
  ask the person who they are; read it from the environment, in this order:
  1. The GitHub account the session acts as: `gh api user --jq .login`, or the GitHub MCP
     `get_me` tool in the cloud sandbox.
  2. The user identity the harness gives you (Claude Code states the user's email in its context).
  3. `git config user.email`, in a local checkout only. In the cloud sandbox it names the agent.

  Use a source only when it names the person you are working with. Never infer a handle from a
  name.

- **Append, never edit.** To reverse an entry, append a new one with `supersedes: D-n`. Ids are
  `D-1`, `D-2`, … in order, newest last.
- **Do not log a decision nobody made.** If you cannot tell whether the person chose something or
  only described it, ask them (as a numbered question), then record their answer.

## Answering "who decided this?"

Read the spec's `## Changelog` and follow `supersedes:` chains to the live entry. Report the
decider with its prefix, and say whether a person approved it later. For example: "user:alice
decided", or "agent:claude-code decided for user:alice; not approved yet". Never merge the two into
"the team decided".

## Checking your work

Run both checks before you commit:

```bash
node packages/reflect/deus/scripts/check-changelog.ts
node packages/reflect/deus/scripts/lint-mdl.ts --only mdl/decision <file.mdl>...
```

`check-changelog.ts` compares every changed `.mdl` file with the merge base of `origin/main`,
uncommitted edits included. CI runs the same script as **Check spec changelogs**. It fails when:

- the spec changed outside `## Changelog` and no decision was added;
- a new spec has no decision;
- an existing entry was edited, removed or reordered;
- an id is out of sequence, or `supersedes:` names an id that is not in the log;
- a decision breaks the attribution rules below.

It skips language definitions (`packages/reflect/deus/lang/`), review rules (`rules/`) and test
fixtures. Only `decision` blocks under `## Changelog` count as the log. Example decisions elsewhere
in the document are ignored.

`lint-mdl.ts` runs the editor's checks. With `--only mdl/decision` it reports a `decision` with no
typed `by:`, an `agent:` decision with no `for:`, a `for:` on a `user:` decision or one that names
an agent, and a `quote:` on an `agent:` decision. Without `--only` it also runs the block-type
check. That check knows only the built-in types, so it flags dialect blocks such as `node` or
`plank` in documents that are valid.

Run `pnpm format` before committing.
