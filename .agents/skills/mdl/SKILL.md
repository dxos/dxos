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
| `lang/sql.mdl`                     | `table` — a SQL table a component owns                               |
| `lang/showcase.mdl`                | `showcase` — a non-normative example of a feature (a PR's deck)      |
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
5. **Name code, never its path.** Refer to code by component or symbol (`FeedStore`, `IndexEngine`) and
   to another spec by its frontmatter `id` (`org.dxos.feed`), not by file path: files move, names stay.
   Point into another spec with `<spec id>#<item>` (`org.dxos.ui.react-ui-canvas#F-9.2`), never a
   `github:` key into a `.mdl` file. Every spec you refer to must be a dependency: a `uses <id>: why`
   block under `## Dependencies` (after the opening prose, before `## Extensions`; `lang/core.mdl`), or,
   for a plugin's runtime dependency, an entry in the `plugin` block's `dependsOn` (`lang/plugin.mdl`),
   which must equal `dx.config.ts`'s. Never list one id in both. Check with
   `pnpm deus lint --only mdl/ref <file.mdl>` and `--only mdl/uses`.

## Showcases: non-normative examples

When a PR that implemented a feature merges, its showcase (the `showcase` skill's deck) stays with the
feature as a `showcase` block in a `## Showcase` section, after the features and before `## Changelog`,
opened with "The following are non-normative examples." A showcase states nothing the system must do:
it is not a spec item, reviews do not judge it, and when it disagrees with the code it is stale. Its
`for:` cites the `feat`/`req` ids it shows, and `deus lint` (`--only mdl/showcase`) rejects one that
cites none or an id the document does not declare. Name the PR and media by URL; the deck lives beside
the spec as `showcase/<SC-n>.md`, located by its id. The block is the spec-file counterpart of
plugin-projects' `Demonstrates` relation: in a space the same deck is a Presentation, made by
`CreateShowcase`, that demonstrates the same features. Adding a showcase is a spec change, so it needs a
decision like any other.

## The changelog

A spec's `## Changelog` is an append-only log of every decision that changed it. Its purpose is to
trace how the spec came to say what it says, and to keep what people decided apart from what
agents decided. The dialect and its rules are in `lang/changelog.mdl`; read them once.

**Every change to a spec adds at least one decision, in the same commit.** That includes renames,
reworded requirements and spec-sync reconciliation. CI rejects a changed spec with no new entry
(see [Checking your work](#checking-your-work)). Two exceptions:

- **Trivial edits need no decision.** These are whitespace changes, and fixes to at most 3 words of
  1–2 letters each (`recieved` → `received`). The check decides this, not you. A changed word that
  contains a digit (an id such as `F-1.2`, a number) or is a normative word (`must`, `not`,
  `never`, `only`, …) is never trivial.
- **Escape hatch: the `Spec-Changelog-Skip` commit trailer.** Use it only for an edit that changes
  no requirement: a bulk mechanical edit, such as a rename across many specs or a reformat, or a
  change with no spec decision behind it, such as a new diagram or reorganized sections (see
  "Record spec decisions, never process"). Do not use it for a change that is real but small, and
  do not use it to avoid asking who made a decision.
  Add the trailer, with a reason, to a commit on the branch:

  ```
  plugins: rename DeckPlank to Plank in every PLUGIN.mdl

  Spec-Changelog-Skip: mechanical rename, no requirement changes
  ```

  It lifts only the missing-decision rule, for every spec on the branch. The append-only rules
  still apply. Say in the PR body that you used it, and why.
  If the spec has no `## Changelog` yet, add one as
  the last section before any appendix, and add `decision` to its Extensions table:

```
| `decision` | `org.dxos.mdl.decision@1.0` |
```

### Record spec decisions, never process

A decision is a choice about the system the spec describes: its behavior, requirements, structure,
interfaces, data, tests, or the reason for one of those. How you or the person worked on the spec or
its code is not a decision, so it never goes in the log:

- which tool, skill or format to use ("use the sharing-specs skill", "draw it with the illustrator");
- how the spec is shared, published or reviewed ("share it as an Artifact");
- which PR, branch or repository a change goes in, or that it continues earlier work;
- that the document should exist, have diagrams, or be reorganized;
- the order of tasks, or "fix it properly" with nothing about what the system must do.

When a person's instruction is only about process, follow it and record nothing. When it mixes
both, record only the spec part ("trace askAgent" is process; "askAgent reports its timings" is
spec). A spec change with no decision behind it, such as a new diagram, carries the
`Spec-Changelog-Skip` trailer (below). A spec whose system is itself a process (Deus, a review
harness, a workflow) records decisions about that process; that is its subject, not your process.

### Separate the person's knowledge from yours

A person usually gives coarse direction and you fill in the gaps. Never merge the two into one
entry. Record them in this order:

1. **First, what the person said: faithfully, and nothing more.** One `by: user:<them>` entry per
   instruction. The prose restates their decision in spec terms. Prompts are messy and lack
   context, so do not paste them. You may:
   - resolve references ("it", "the canvas" → `Scene`, "that bug" → the issue);
   - include the context needed to read the entry on its own;
   - fix wording, spelling and grammar.

   You must not add or remove information: no requirement, rationale or assumption they did not
   give, and nothing they said dropped. If you had to choose between readings, that choice is
   yours and goes in step 2. `source:` links to where they said it, when there is a link.

2. **Then, what you added: as separate entries.** One `by: agent:claude-code` entry per independent
   choice you made to fill the gaps (a shape, a name, an edge case, your reading of an ambiguous
   phrase). Each one names your principal in `for:` and the entry it builds on in its prose
   (`Fills in [D-1].`). Put the reasoning in `why:` and the alternatives you dropped in `rejected:`.
3. **A person approving your entries is a new decision, by them.** When they accept your design,
   append a `user:` entry such as `Approve [D-2] and [D-3].` When they accept it with changes,
   record the changes as their decision, with `supersedes:` where it replaces one of yours. Never
   edit your own entry to say it was approved.

```mdl
decision D-1: The `Scene` canvas grows when a node moves past its edge.
  date: 2026-10-20
  by: user:alice
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

Run all three checks from the repo root before you commit (`dx deus …` is the same command tree):

```bash
pnpm deus changelog check
pnpm deus lint --only mdl/decision <file.mdl>...
node .agents/skills/mdl/scripts/check-decisions.ts
```

`check-decisions.ts` (in this skill's `scripts/`) asks TypeSafe System One whether each decision your branch adds records
process instead of a spec decision, and fails at a probability of 0.8 or more. It needs
`TYPESAFE_API_KEY` (`1password` skill); without it, it passes with a notice. Pass file paths to
judge every decision in those files, with each probability printed. CI runs it as **Check spec
decisions**. When it flags a decision, remove the process from it, or remove the entry.

`deus changelog check` compares every changed `.mdl` file with the merge base of `origin/main`
(`--base <ref>` or `MDL_BASE_REF` picks another), uncommitted edits included. CI runs the same
command as **Check spec changelogs**. It fails when:

- the spec changed outside `## Changelog` beyond a trivial edit, no decision was added, and no
  branch commit carries `Spec-Changelog-Skip`;
- a new spec has no decision;
- an existing entry was edited, removed or reordered;
- an id is out of sequence, or `supersedes:` names an id that is not in the log;
- a decision breaks the attribution rules below.

It skips language definitions (`packages/reflect/deus/lang/`), review rules (`rules/`) and test
fixtures. Only `decision` blocks under `## Changelog` count as the log. Example decisions elsewhere
in the document are ignored.

`deus lint` runs the editor's checks. With `--only mdl/decision` it reports a `decision` with no
typed `by:`, an `agent:` decision with no `for:`, a `for:` on a `user:` decision or one that names
an agent. Without `--only` it also runs the block-type
check. That check knows only the built-in types, so it flags dialect blocks such as `node` or
`plank` in documents that are valid.

Run `pnpm format` before committing.
