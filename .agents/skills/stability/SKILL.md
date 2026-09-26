---
name: stability
description: >-
  Turn production errors into root-cause fixes — scan SigNoz (EDGE workers) and
  PostHog (Composer), catalog each issue as a task in the Composer "Stability"
  project, then drive one agent per task through a failing-first repro, a fix,
  a PR and a landing. Use when asked to do stability work, triage production
  errors or exceptions, work a Stability task, or open a PR that fixes an error
  seen in production.
---

# Stability

Stability work turns an error seen in production into a merged fix with a test that proves it. Each
issue is tracked as a task in the Composer **Stability** project, worked by one agent on its own branch,
and closed only when the fix lands.

The loop:

1. **Scan** SigNoz and PostHog for error signatures.
2. **Catalog** each distinct issue as a top-level task, with its evidence.
3. **Assign** one agent per task, each in its own worktree and branch. Never share one.
4. **Reproduce** with a test that fails on `main` for the reported reason.
5. **Fix** the root cause.
6. **PR**, then **land**, then mark the task `done`.

## Tracking in the Stability project

The project lives in Composer and is reached through the Composer MCP server
(`composer.dxos.network/mcp`). Find an operation with `queryOperations`, read its input schema, then
run it with `invokeOperation`. Pass `spaceId` on every write.

| Object  | Id                                  |
| ------- | ----------------------------------- |
| Space   | `BPBG3HN4O2XTMB5MRDZQXJBAXA7LAH4IA` |
| Project | `01M36YWSD6VF8E677XGFYPAXAV`        |
| TaskSet | `01M36YWSD6VF8E677XGFYPAXAW`        |

A ref is `{"/": "echo://<space>/<id>"}`. Pass refs back exactly as you received them.

**Read the project's Instructions text first.** It holds the standing preferences (for example,
whether a source is paused) and overrides this skill where they differ.

The operations (keys `org.dxos.operation.tasks.*`, defined in
`packages/plugins/plugin-tasks/src/types/TaskOperation.ts`):

| Operation           | Input                                                                          |
| ------------------- | ------------------------------------------------------------------------------ |
| `tasks.list`        | `taskSet`, `status?`, `includeSubtasks?`                                       |
| `tasks.create`      | `taskSet`, `parentTask?`, `title`, `description?`, `priority?`                 |
| `tasks.update`      | `task`, `status?`, `description?`, `remoteSession?: {sessionId, repo, branch}` |
| `tasks.askQuestion` | `task`, `question`, `context?`, `options?`                                     |

Rules for the task list:

- **A top-level task is an actual issue.** One error signature, one root cause.
- **Small items are subtasks, never top-level.** Follow-ups, dependency bumps, merges, eval coverage
  and out-of-scope fixes go under the issue they came from (`parentTask`).
- **Status runs `todo` → `started` → `review` → `done`.** `blocked` means waiting on a decision.
- **Claim a task by assigning your session.** Pass `remoteSession` with your harness session id,
  repo and branch when you set it `started`.
- **Keep the description current.** It carries the evidence, the PR link and what is left.

## Questions and decisions

Do not stall on a question. File it with `tasks.askQuestion`: it records a `question` entry in the
task's history and sets the task `blocked`. Then move to another task.

Read the reply from the task's `history` later: the entry with `event: "answer"` whose `questionId`
matches the one `askQuestion` returned. A task holds one open question at a time.

## Sources

- **SigNoz** covers EDGE (the Cloudflare workers in `dxos/edge`). Filter on `service.name` first.
- **PostHog** covers Composer. Its queries can be slow and block the session. If the project
  Instructions mark PostHog as paused, follow them.

Record the evidence in the task, so anyone can re-run it:

- the query (or a link to the saved view);
- the error signature, verbatim;
- counts, and first and last seen;
- trace ids or session ids of representative events.

A Composer feedback-form report arrives as a Linear issue with a log bundle; triage those with
[[user-submissions]].

## Repro first

Write the test before the fix.

1. **Show it failing on `main` for the reported reason.** Quote the failure output. A test that fails
   for some other reason proves nothing.
2. **Show it passing with the fix.** Quote that output too.
3. **Use the lowest layer that reproduces it.** A unit test over a service beats an integration test
   over the app.
4. **Make it deterministic.** No sleeps to force timing. Drive time with Effect's `TestClock` and
   ordering with promises the test resolves itself.
5. **For Cloudflare workers, write a `*.workerd.test.ts`** so it runs in workerd, not Node.

If the issue will not reproduce, say so in the task and list what you tried. Do not fix
speculatively. When the logs cannot explain the failure, the deliverable is the missing
instrumentation, as in [[user-submissions]].

## Fix the root cause

A fix removes the cause. Anything that only hides the symptom is not a fix:

- no retry, catch, timeout or suppression wrapped around the failure;
- no casts to quiet the type-checker ([[code-style]]);
- no `dangerouslyIgnoreUnhandledErrors`, and no swallowed rejections;
- no quarantine, skip or retry for a flaky test: find why it flakes;
- no bigger guard in place of the missing invariant.

If the proper fix is out of scope, fix what is in scope, file the rest as a subtask, and say so in the
PR body.

## The PR

Open it with [[submit-pr]]. Write the body per [[readable-prose]], in these sections:

- **Discovery & symptoms.** Source, error signature, frequency, links to the query or traces.
- **Root cause.** The mechanism, with the evidence that proves it.
- **Test repro.** The before and after output.
- **Fix.** What changed and why that removes the cause.
- **Screenshots / videos.** When the change is visible in the UI ([[recording-demos]]).

Link the Stability task. Keep it short: length is earned by content.

Titles are `scope: description` in `dxos/dxos` and Conventional Commits in `dxos/edge`. A
consumer-relevant `dxos` change needs a changeset (`agents/instructions/changesets.md`).

Set the task `review` once the PR is open.

## Across dxos and edge

- **Link locally.** Run `pnpm link-packages` in the edge checkout to test an unpublished `dxos`
  change. Never publish through `pkg.pr.new` to see your own change. Undo before committing
  (`git checkout -- package.json && pnpm install`).
- **Stacked PRs name their base** in the body, and land in order.
- **Merge `main` into a shared branch; do not rebase it.** A rebase rewrites commits someone else
  has checked out.

## Landing

Land with [[land]] once all three hold:

- approved, or a maintainer has left an equivalent comment ("good to land");
- CI is green (red `Check` runs: [[depot-ci]]);
- the branch is mergeable.

Every reviewer comment is addressed in code or answered in the thread. `dxos/dxos` lands by
auto-merge (squash) through the merge queue; `dxos/edge` squash-merges. Then set the task `done`.
