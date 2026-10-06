---
name: pr-description
description: >-
  Write or rewrite a pull request description from literal section templates — summary and safety
  (always), bugfix, architecture, and UI — so every PR body has the same headings, tables and line
  formats. Architecture diagrams are rendered with plugin-illustrator's DSL CLI, never Mermaid. Use
  whenever you open a PR, edit a PR body (`gh pr edit --body`, `update_pull_request`), or are asked
  to write, fix, or review a PR description. The `submit-pr` skill calls this at its "open the PR"
  step.
---

# PR descriptions

Every PR body is assembled from **literal** templates: each template file holds one markdown block
that is copied verbatim, with only its `{{…}}` slots replaced. The headings, bold labels, table
columns and fixed words are the same in every PR, so a reviewer finds the same thing in the same
place each time and tooling can parse it.

Pick every template whose trigger matches the diff, then stack them in this order. One PR can be a
bugfix with a UI aspect and a new dependency between macro components; it then carries all five.

| Order | Template                                  | Heading           | Applies when                                                                               |
| ----- | ----------------------------------------- | ----------------- | ------------------------------------------------------------------------------------------ |
| 1     | [summary](templates/summary.md)           | `## Summary`      | Always.                                                                                    |
| 2     | [bugfix](templates/bugfix.md)             | `## Bug`          | The PR fixes a defect: wrong behaviour, crash, hang, data loss, regression.                |
| 3     | [architecture](templates/architecture.md) | `## Architecture` | New code across macro components, a new package or service, or changed edges between them. |
| 4     | [ui](templates/ui.md)                     | `## UI`           | Anything a user sees changes: styling, layout, a new component, a new or changed flow.     |
| 5     | [safety](templates/safety.md)             | `## Safety`       | Always. Last, so it reads as the merge checklist.                                          |

## Body skeleton

The assembled body is exactly this, with the conditional sections that do not apply removed whole
(heading included) and nothing else added:

```markdown
## Summary

…

## Bug

…

## Architecture

…

## UI

…

## Safety

…

{{HARNESS_FOOTER}}
```

`{{HARNESS_FOOTER}}` is the attribution footer your harness requires, in its exact text; omit it
when the harness requires none.

## Literal rules

- **Copy, don't paraphrase.** Headings (`##`, `###`), bold labels (`**Found by:**`), table headers and
  column order are kept character for character. Do not rename, reorder, merge, or add headings,
  and do not add a section that has no template (`## Testing`, `## Notes`, `## Changes`).
- **Every slot is filled; none survives.** Each template's slot table says what goes in each slot
  and the exact word to write when there is nothing to say (`none`, `None.`, `No`, `—`). An
  inapplicable subsection keeps its heading and gets that word; it is never deleted on its own.
- **Only the variants a template names.** Where a template allows an alternative form (no
  automated reproduction, a static UI change, no dependency edges), use the exact replacement
  text it gives.
- **Nothing outside the sections** except the footer: no preamble, no "This PR…" line above
  `## Summary`, no emoji besides the footer's, no horizontal rules.
- **Diagrams are plugin-illustrator renders, never Mermaid.** No ` ```mermaid ` block anywhere in
  the body; see [architecture](templates/architecture.md) for the CLI.

Before posting, check that no slot is left and no foreign heading crept in:

````bash
grep -n '{{' "$BODY_FILE"                                                     # must print nothing
grep -n '^#' "$BODY_FILE" | grep -vE '^[0-9]+:(## (Summary|Bug|Architecture|UI|Safety)|### (Discovery and symptoms|Reproduction|Root cause|Fix|Diagram|Dependency changes|Design notes|Screenshots|Demo))$'   # must print nothing
grep -n '```mermaid' "$BODY_FILE"                                             # must print nothing
````

## How to pick

Decide from the diff against the PR's own base, not from the commit messages or the task prompt.
That base is `origin/main` for a standalone or bottom-of-stack PR, and the parent PR's head branch
for a stacked child, so the parent's changes do not pick templates for this PR:

```bash
BASE=origin/main                   # standalone or bottom of stack
# BASE=origin/feature-parent-pr    # stacked child: substitute the parent PR's head branch
git diff --stat "$BASE"...HEAD
```

- **Bugfix**: the branch exists because something was broken. A refactor that happens to fix a bug
  on the way still takes it; say so in the summary.
- **Architecture**: a macro component is a package, a plugin, a worker or service (`dxos/edge`), or
  a top-level subsystem (ECHO, HALO, MESH, compute). The template applies when the PR adds one,
  splits one, or adds or removes a dependency between two. A change inside one package does not
  qualify, however large.
- **UI**: any change to rendered output, including a theme token or a translation string a user
  reads. A pure storybook or test change does not qualify.
- When unsure whether a conditional template applies, include it. A section answered with the
  template's "none" words costs the reviewer one line; a missing one costs them the question.

## How to fill

- Every claim points at evidence: a test name, a file path, a log line, a measurement, a link.
- Write each slot per the `readable-prose` skill. Length is earned by content; a one-line fix gets
  short slots even with five sections.
- Binaries (screenshots, videos, diagram PNGs) are attached with `gh --attach` so they render inline,
  falling back to the R2 bucket — both per the `hosting-artifacts` skill. Never commit them to make
  them visible.

## Rewriting

A PR body describes the PR as it will merge, not its history. When later pushes change the
picture (a new test, a reverted approach, a second bug), rewrite the affected slots rather than
appending an "Update:" paragraph. Re-check which templates apply on each rewrite, and re-run the
checks above.
