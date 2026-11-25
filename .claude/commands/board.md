---
description: Keep the session board — start, build and publish it, or sync its goals with Composer tasks
argument-hint: '[start <slug> | sync | build]'
---

Arguments: `$ARGUMENTS`

Follow the `status-board` skill (`.agents/skills/status-board/SKILL.md`). Read it first if it is not loaded this
session. The CLI is `node --conditions=source tools/session-board/src/cli.ts`, written `cli.ts` below.

**No arguments** — bring the board up to date:

1. With no current board (`.claude/.status-board/current` missing), start one as `start` below, with a slug made
   from the session's task.
2. Run `sync` below when the session can reach a Composer MCP server; skip it silently when none is connected.
3. Update goals, PRs and questions from the work so far, and add an `event` for each change (skill §2–§4).
4. `cli.ts build`, then publish the page with the Artifact tool (skill §5). Reply with one line and the link.

**`start <slug>`** — `cli.ts start .agents/sessions/<today>-<slug>`, replace the skeleton's title, summary and first
goal, then build and publish.

**`sync`** — pull the Composer tasks delegated to this session into the board as goals (skill §8):

1. `cli.ts session-id` prints the ids Composer may file this session under, most likely first.
2. Load the server's `project` skill (`loadSkill`) and pass its `skillToken` on every call below.
3. Call `org.dxos.operation.tasks.recordSession` with `{ sessionId }` for the first id. Save the JSON result to the
   scratchpad and run `cli.ts tasks <file>`.
4. If that call fails, or reports the session unrecorded, use the fallback in skill §8.
5. Build, publish, and report in one line what was added, what changed, and what is no longer open.

**`build`** — `cli.ts build` and publish, without touching the file.
