---
name: mdl
description: >-
  Write and edit `.mdl` specs (Deus) — `PLUGIN.mdl`, `SPEC.mdl`, `spec/APP.mdl` — and record
  decisions in a spec's `## Changelog`, each attributed to the person (`user:`) or agent (`agent:`)
  that made it. Use when creating or changing a `.mdl` file, adding a block type to one, when a
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

A spec's `## Changelog` section is an append-only log of the authoritative decisions behind it.
Its purpose is to trace how the spec came to say what it says, and to keep decisions made by
people separable from decisions made by agents. The rules are in `lang/changelog.mdl` — read them;
the ones you will hit most:

```mdl
decision D-4: Bounds grow to the major grid.
  date: 2026-10-20
  by: agent:claude-code
  for: user:alice@example.com
  affects: [Scene, F-2.1]
  why: The minor grid re-lays the canvas on every drag step.
  source: https://github.com/dxos/dxos/pull/<n>
```

- **Who decided, not who typed.** A choice the person stated in the conversation, a review, or an
  issue is `by: user:<them>`, with `source:` pointing at where they said it. You write the entry;
  they made the decision. Use `by: agent:<name>` only for a choice you made yourself.
- **Your agent name is the harness, never the model** — `agent:claude-code` in this repo. Models
  change mid-session; the name must not.
- **An agent entry names its principal.** `for: user:<handle>` is the person whose instruction you
  were working under. Use the user's GitHub username, or their email when that is what you have.
- **Ratify, don't rewrite.** When a person endorses your decision, add `ratified-by: user:<them>`
  to your entry. Never change `by:`.
- **Append, never edit.** Reversals are new entries with `supersedes: D-n`. Ids are monotonic.
- **Log decisions, not edits.** A new requirement, a boundary, a type shape, an alternative that
  was rejected and will be proposed again — yes. A rename, a typo, a reformat — no.
- **Do not log a decision nobody made.** If you are unsure whether the person chose something or
  only described it, ask them (numbered), and record the answer.

When a session settles a design question that changes a spec, add the entry in the same commit as
the spec change, so the PR shows the decision next to its effect.

If the spec has no `## Changelog` section yet, add one as the last section before any appendix,
and add `decision` to its Extensions table:

```
| `decision` | `org.dxos.mdl.decision@1.0` |
```

## Answering "who decided this?"

Read the spec's `## Changelog`, follow `supersedes:` chains to the live entry, and report the
decider with its prefix kept — say "user:alice decided", "agent:claude-code decided for
user:alice, unratified". Do not merge the two into "the team decided".

## Checking your work

The editor runs the same checks as this script; run it on every `.mdl` you changed:

```bash
node packages/reflect/deus/scripts/lint-mdl.ts --only mdl/decision <file.mdl>...
```

It exits non-zero on a `decision` without a typed `by:`, an `agent:` decision without `for:`, a
`for:` on a `user:` decision, or a `for:`/`ratified-by:` that is not a `user:`. Drop `--only` to
also see the block-type check, which today knows only the built-in types and so flags dialect
blocks like `node` or `plank` in valid documents.

Run `pnpm format` before committing.
