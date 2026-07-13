---
name: land
description: Land an existing PR — finds it, fixes CI failures iteratively, keeps the branch up to date with main, subscribes to PR events for continuous autofixing, and adds to merge queue. Use when the user says "/land <PR number or URL>" or asks to land/ship an existing PR. Accepts optional extra instructions after the PR reference.
---

# Land PR

You are in **Land Mode** — your job is to take an existing pull request, get it green, and land it without manual intervention. You **never** create a new branch or a new PR. You work exclusively on the branch and PR that already exist.

---

## Step 1 — Parse the PR reference

The user invoked `/land` with arguments. Extract:

- **PR number**: from a bare integer (`7342`) or a GitHub URL (`.../pull/7342`).
- **Extra instructions**: any text after the PR number/URL — these are additional constraints or context to keep in mind while fixing.

If no PR reference was given, ask the user for one before proceeding.

---

## Step 2 — Fetch PR metadata

Use `mcp__github__pull_request_read` with `{ owner: "dxos", repo: "dxos", pullNumber: <number> }` to retrieve:

- `headRefName` — the branch you will work on.
- `baseRefName` — usually `main`.
- Current state (open/merged/closed), draft status, merge-ability.
- Title, body, labels.

If the PR is already merged or closed, tell the user and stop.

---

## Step 3 — Check out the branch locally

```bash
export PROTO_HOME="$HOME/.proto" && export PATH="$PROTO_HOME/shims:$PROTO_HOME/bin:$PATH"
git fetch origin <headRefName>
git checkout <headRefName>
```

**Never create a new branch.** If the checkout fails for any reason, diagnose and fix before continuing.

Confirm the worktree is on the right branch with `git branch --show-current`.

---

## Step 4 — Sync with base branch

Keep the branch up to date with `main` (or the base branch):

```bash
git fetch origin main
git merge origin/main --no-edit
```

If there are merge conflicts, resolve them. After resolving:

```bash
git add -A
git commit -m "chore: merge main into branch"
git push -u origin <headRefName>
```

If `git merge` is clean, push only if there are new commits:

```bash
git push -u origin <headRefName>
```

**Never use `--force` or `--force-with-lease`.** If push is rejected due to protected-branch rules, report to user and stop.

---

## Step 5 — Assess current CI status

Use `mcp__github__pull_request_read` again (or search recent check runs) to understand which checks are failing.

Look specifically for the **"Check"** workflow — it covers build, test, lint, and fmt. Any red check is YOUR responsibility to fix.

Build a **status checklist** like:

```
## Land Status — PR #<number>
- [ ] Build passing
- [ ] Tests passing
- [ ] Lint passing
- [ ] Fmt passing
- [ ] Merge conflicts resolved
- [ ] Review comments addressed
- [ ] In merge queue
```

Print this checklist and keep it updated throughout the session.

---

## Step 6 — Fix CI failures

For each failing check:

1. Identify the failing job and step from CI logs.
2. Reproduce locally:
   - Build: `moon run <package>:build`
   - Tests: `moon run <package>:test -- <test-file>`
   - Lint: `moon run :lint -- --fix`
   - Format: `pnpm format`
3. Apply the fix at the **root cause** — no casts, no `// @ts-ignore`, no `--no-verify`.
4. Run the specific check locally to confirm the fix.
5. Commit with a clear, descriptive message and push.

**Prohibited shortcuts:**

- `as any`, `as unknown`, non-null `!` to silence type errors.
- `--no-verify` to skip hooks.
- Commenting out failing tests.
- Force-push.
- Modifying CI config to skip the failing step.

After each push, re-examine CI to confirm the fix landed correctly.

---

## Step 7 — Address review comments

Use `mcp__github__pull_request_read` to check for unresolved review threads. For each unresolved thread:

- If the comment requests a code change and you agree, apply it.
- If you disagree or need clarification, reply explaining why.
- If already addressed by your commits, reply confirming.

---

## Step 8 — Enable auto-merge (merge queue)

Once all required checks pass and there are no blocking reviews, enable auto-merge so the PR enters the merge queue automatically:

```
mcp__github__enable_pr_auto_merge({ owner: "dxos", repo: "dxos", pullNumber: <number>, mergeMethod: "squash" })
```

If the repo uses a merge queue, this will enqueue the PR. If auto-merge is not available (e.g., branch protection requires manual merge), tell the user.

---

## Step 9 — Subscribe and stay active

```
mcp__github__subscribe_pr_activity({ owner: "dxos", repo: "dxos", pullNumber: <number> })
```

Then **end your turn** — do NOT actively poll.
Use webhook-driven wakeups, plus the Step 9.5 background sleep alarm for merge-queue dequeue detection.
You will receive `<github-webhook-activity>` events.

On each event:

### CI failure event

1. Check which job failed.
2. Fetch logs to diagnose.
3. Apply fix locally, test locally, commit, push.
4. Print updated status checklist.
5. If the same check fails repeatedly (3+ times) with no progress, ask the user.

### Review comment event

1. Read the comment.
2. If it requests a change: apply it, commit, push, optionally reply.
3. If it approves: note it in checklist, check if auto-merge can now be enabled.
4. If it requests changes that are out of scope or incorrect: reply explaining why.

### PR merged event

1. Print final success message with PR URL.
2. Call `mcp__github__unsubscribe_pr_activity`.
3. Stop.

### PR closed (not merged) event

Ask the user what happened and whether to reopen.

---

## Step 9.5 — Poll the merge queue every 15 minutes

Webhooks do **not** fire when a PR is automatically dequeued from the merge queue (e.g., due to a conflict or a failed queue CI run). You must poll for this yourself.

After auto-merge is enabled, arm a 15-minute wakeup alarm using a background Bash sleep:

```text
Bash("sleep 900", { run_in_background: true })
```

This completes silently after 15 minutes and fires a task-completion notification that wakes this session. It requires no external service.

On each wakeup (task-completion notification for the sleep):

1. Call `mcp__github__pull_request_read` to get the current PR state.
2. **If merged**: print success, unsubscribe, stop.
3. **If closed**: ask the user what happened.
4. **If open and auto_merge is null** (was dequeued):
   a. Sync with `main`:
   ```bash
   git fetch origin main
   git merge origin/main --no-edit
   git push -u origin <headRefName>
   ```
   b. Resolve any conflicts that arise, commit, push.
   c. Re-enable auto-merge:
   ```text
   mcp__github__enable_pr_auto_merge({ owner: "dxos", repo: "dxos", pullNumber: <number>, mergeMethod: "squash" })
   ```
   d. Log: "PR was dequeued — re-synced with main and re-enabled auto-merge."
   e. Re-arm the alarm: `Bash("sleep 900", { run_in_background: true })`.
5. **If open and auto_merge is set** (still in queue): re-arm silently: `Bash("sleep 900", { run_in_background: true })`.

Stop re-arming once the PR is merged or closed, or the user says to stop.

---

## Step 10 — Keep in sync

Whenever CI detects the branch is behind `main`, or whenever you push a fix, check:

```bash
git fetch origin main
git log HEAD..origin/main --oneline
```

If behind, merge and push before the next fix commit. This prevents merge conflicts from accumulating.

---

## Rules

- **Never** create a new branch or PR.
- **Never** force-push.
- **Never** use `--no-verify`.
- **Never** cast types to silence errors (`as any`, `!`, etc.).
- **Never** skip or modify CI checks to make them pass artificially.
- **Never** merge around branch protection.
- **Always** fix the root cause.
- **Always** test locally before pushing.
- **Always** keep the status checklist current.
- **Always** stay subscribed until the PR is merged or the user says stop.
- Apply **extra instructions** (from the `/land` invocation) as additional constraints throughout the session — they override defaults where relevant.

---

## Environment setup

```bash
export PROTO_HOME="$HOME/.proto" && export PATH="$PROTO_HOME/shims:$PROTO_HOME/bin:$PATH"
```

This project uses:

- `moon` for task running (`moon run <package>:task`)
- `pnpm` for package management
- `mcp__github__*` tools for all GitHub operations (no `gh` CLI in remote environments)
- TypeScript with strict linting
- Single quotes, functional patterns, TailwindCSS

---

## Status checklist template

Maintain and reprint this on every significant event:

```
## Land Status — PR #<number>: <title>
Branch: <headRefName>

Checks:
- [x/○] Build
- [x/○] Tests
- [x/○] Lint
- [x/○] Fmt
- [x/○] No merge conflicts
- [x/○] Reviews resolved
- [x/○] Auto-merge enabled
- [x/○] MERGED

Last action: <what you just did>
Next: <what you're waiting for or doing next>
```
