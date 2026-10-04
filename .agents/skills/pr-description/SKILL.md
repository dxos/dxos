---
name: pr-description
description: >-
  Write or rewrite a pull request description from section templates — safety (always), bugfix,
  architecture, and UI — picking every template that applies and stacking them in one body. Use
  whenever you open a PR, edit a PR body (`gh pr edit --body`, `update_pull_request`), or are asked
  to write, fix, or review a PR description. The `submit-pr` skill calls this at its "open the PR"
  step.
---

# PR descriptions

A PR body is assembled from section templates, one file per kind of change. Pick every template
whose trigger matches the diff, then stack them in the order below. One PR can be a bugfix with a
UI aspect and a new dependency between macro components; it then carries all five templates.

| Order | Template                                  | Applies when                                                                               |
| ----- | ----------------------------------------- | ------------------------------------------------------------------------------------------ |
| 1     | [summary](templates/summary.md)           | Always. Two to four sentences: what changes and why.                                       |
| 2     | [bugfix](templates/bugfix.md)             | The PR fixes a defect: wrong behaviour, crash, hang, data loss, regression.                |
| 3     | [architecture](templates/architecture.md) | New code across macro components, a new package or service, or changed edges between them. |
| 4     | [ui](templates/ui.md)                     | Anything a user sees changes: styling, layout, a new component, a new or changed flow.     |
| 5     | [safety](templates/safety.md)             | Always. Last, so it reads as the merge checklist.                                          |

## How to pick

Decide from the diff against the PR's own base, not from the commit messages or the task prompt.
That base is `origin/main` for a standalone or bottom-of-stack PR, and the parent PR's head branch
for a stacked child, so the parent's changes do not pick templates for this PR:

```bash
git diff --stat origin/main...HEAD             # standalone or bottom of stack
git diff --stat origin/<parent-branch>...HEAD  # stacked child
```

- **Bugfix**: the branch exists because something was broken. A refactor that happens to fix a bug
  on the way still takes it; say so in the summary.
- **Architecture**: a macro component is a package, a plugin, a worker or service (`dxos/edge`), or
  a top-level subsystem (ECHO, HALO, MESH, compute). The template applies when the PR adds one,
  splits one, or adds or removes a dependency between two. A change inside one package does not
  qualify, however large.
- **UI**: any change to rendered output, including a theme token or a translation string a user
  reads. A pure storybook or test change does not qualify.
- When unsure whether a conditional template applies, include it. An empty-ish section costs the
  reviewer one line; a missing one costs them the question.

## How to fill

- Each template file gives its headings and what goes under each. Keep the headings verbatim so
  reviewers and tooling can find them; drop the guidance text.
- Every claim points at evidence: a test name, a file path, a log line, a measurement, a link.
- Write it per the `readable-prose` skill. Length is earned by content; a one-line fix gets a short
  body even with five sections.
- Binaries (screenshots, videos, diagram PNGs) go to the `hosting-artifacts` bucket and are linked,
  never committed to make them visible.
- Link Linear issues on their own line at the end of the summary: `closes DX-123` or `part of DX-123`.
- Finish with the attribution footer your harness requires, after the safety section.

## Rewriting

A PR body describes the PR as it will merge, not its history. When later pushes change the
picture (a new test, a reverted approach, a second bug), rewrite the affected sections rather than
appending an "Update:" paragraph. Re-check which templates apply on each rewrite.
