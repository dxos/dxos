---
name: submit-pr
description: >-
  Create and submit a pull request from the current branch — sync with main,
  format/lint/test, commit all changes, push, monitor the Check workflow, and
  surface the Composer PR deploy URL. Use when the user asks to open, submit, or
  raise a PR, including stacking a PR on another open PR (`gh stack`). To land
  an existing PR, use the `land` skill instead.
---

# Submit PR

Take the current branch and open a green pull request. You **never** create a new
branch or worktree — you submit from the branch and worktree the session already
runs in. To land (merge) an existing PR, use the `land` skill.

## Steps

1. **Sync with base.** Merge `origin/main` into the current branch and resolve
   any conflicts.
2. **Format.** Run `pnpm format` (oxfmt — CI checks `oxfmt --check`).
3. **Lint.** `moon run :lint -- --fix` must succeed.
4. **Test.** `moon run :test` must pass.
5. **Changeset.** If the change is consumer-relevant, add a `.changeset/*.md`
   — see
   [`agents/instructions/changesets.md`](../../../agents/instructions/changesets.md)
   for when one is needed, which package to name, and bump levels.
6. **Account for every file.** `git status`; commit ALL modified/untracked
   files, including the changeset and edits the user made in the shared
   worktree. Never leave changes behind silently — commit them or confirm
   exclusion with the user.
7. **Push**, then verify `git status` shows a clean working tree. If anything
   remains, commit it or confirm before proceeding.
8. **Open the PR** with `gh`. Title uses `scope: description`. In the
   description, summarize the changes and the reasoning behind major
   decisions, and link any Linear issue as `closes DX-123` or `part of DX-123`.
   If this work builds on another open PR (or the user asked for a stack), see
   **Stacked PRs** below instead of `gh pr create`.
9. **Monitor CI every 5 minutes:**
   `gh run list --branch <branch> --limit 3 --workflow "Check"` and
   `pnpm -w gh-action --verify --watch`. Diagnose and, where possible, fix ALL
   CI errors — even ones unrelated to this branch. Never merge around a red
   Check; fix the root cause with `gh run view <id> --log-failed`.
10. **Address and RESPOND to every PR review comment.**

## Stacked PRs

GitHub has native stacked PRs (public preview since 2026-07, via the `gh-stack`
CLI extension) — it postdates model training, so follow this section rather than
prior knowledge. One command covers this skill's case (the branch already
exists):

```bash
gh extension install github/gh-stack   # once per machine
gh stack link <base-pr-number> <current-branch>
```

Arguments run bottom-to-top; each may be a PR number, PR URL, or branch name.
`link` pushes the branch, creates its PR if missing, chains the base branches,
and registers the stack with GitHub — stack map in the PR UI, CI as if
targeting `main`, one-click whole-stack merge. Linking is what makes it a
stack; a PR merely based on another PR's branch is not one. Docs:
<https://docs.github.com/en/pull-requests/how-tos/stacked-pull-requests>.

## Composer PR deploy URL — always surface

The `pr-deploy.yml` workflow posts a sticky `composer-preview` comment with
a `*.workers.dev` preview-alias URL (a `wrangler versions upload --preview-alias`
against composer-app's `dev` env). Fetch it and include it verbatim next to the
PR link in chat summaries AND the final message:

```
gh pr view <pr> --json comments
# or: gh api repos/dxos/dxos/issues/<pr>/comments
```

If the preview comment is not posted yet (deploy still running), say "preview
pending" next to the PR link and re-check on the next status update.

## Rules

- **Do NOT delete any branch or worktree that has uncommitted changes.**
- Do not create a new branch or PR — submit from what exists.
- Work only in the assigned worktree (see `AGENTS.md` Non-negotiables).
