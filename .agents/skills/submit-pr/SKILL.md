---
name: submit-pr
description: >-
  Create and submit a pull request from the current branch — sync with main,
  format/lint/test, commit all changes, push, monitor the Check workflow, and
  surface the Composer preview URL. Use when the user asks to open, submit, or
  raise a PR. To land an existing PR, use the `land` skill instead.
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
5. **Account for every file.** `git status`; commit ALL modified/untracked files,
   including edits the user made in the shared worktree. Never leave changes
   behind silently — commit them or confirm exclusion with the user.
6. **Changeset.** If the change is consumer-relevant, add a `.changeset/*.md`
   and commit it with the rest — see
   [`agents/instructions/changesets.md`](../../../agents/instructions/changesets.md)
   for when one is needed, which package to name, and bump levels.
7. **Push**, then verify `git status` shows a clean working tree. If anything
   remains, commit it or confirm before proceeding.
8. **Open the PR** with `gh`. Title uses `scope: description`. In the
   description, summarize the changes and the reasoning behind major
   decisions, and link any Linear issue as `closes DX-123` or `part of DX-123`.
9. **Monitor CI every 5 minutes:**
   `gh run list --branch <branch> --limit 3 --workflow "Check"` and
   `pnpm -w gh-action --verify --watch`. Diagnose and, where possible, fix ALL
   CI errors — even ones unrelated to this branch. Never merge around a red
   Check; fix the root cause with `gh run view <id> --log-failed`.
10. **Address and RESPOND to every PR review comment.**

## Composer preview URL — always surface

The `preview-deploy.yml` workflow posts a sticky `composer-preview` comment with
a branch-alias URL (`https://<branch-alias>.composer-app.pages.dev`) and a
per-deployment URL. Fetch it and include it verbatim next to the PR link in chat
summaries AND the final message:

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
