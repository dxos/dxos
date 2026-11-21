---
name: status-board
description: Keep one Artifact page as the user's view of a long session — open questions, goals with their task status, pull requests, and an append-only timeline. You write the session as a `SESSION.mdl` (the Deus session dialect); `tools/session-board/src/cli.ts` checks it and fills a prebuilt dark react-ui page that uses the plugin-projects task UI; you publish that page. Never write the HTML yourself. Use when the user asks for a status page, a session dashboard, an overview of the session, or a place where you put questions for them; when a session runs several PRs or subagents in parallel; when the user says your replies are too long; or when the Stop hook says `STATUS BOARD`.
---

# Status board

The user reads the board, not the chat. You write the session as mdl. A script checks it and makes the page. You
publish the page.

```
agents/sessions/<date>-<slug>/SESSION.mdl  →  cli.ts build  →  .claude/.status-board/<date>-<slug>.html  →  Artifact tool
          (you write, committed)              (parse, check)        (prebuilt page + data)                   (you publish)
```

## 1. Start a session

```bash
node --conditions=source tools/session-board/src/cli.ts start agents/sessions/2026-11-21-status-board
```

- It writes `SESSION.mdl` from a skeleton if the file does not exist.
- It makes the file the current board, so the Stop hook builds it.
- Commit the file with the work of the session.

## 2. Write `SESSION.mdl`

The format is the session dialect, `packages/reflect/deus/lang/session.mdl` (`org.dxos.spec.session`). Read it once.
It extends the changelog dialect, so questions and answers follow the `mdl` skill.

| Section            | Block                | Fields                                                     |
| ------------------ | -------------------- | ---------------------------------------------------------- |
| `## Questions`     | `question Q-n: text` | `date`, `by`, `for`, `context`, `options` (`- Title: why`) |
| `## Goals`         | `goal G-n: title`    | `status`, `blockedBy: [Q-n]`, `notes`                      |
| `## Pull requests` | `pr PR-n: title`     | `ref: owner/repo#n`, `status?`, `goals`, `notes`           |
| `## Changelog`     | `decision D-n: text` | `date`, `by`, `answers: Q-n`                               |
| `## Timeline`      | `event T-n: text`    | `date: 2026-11-21T11:55Z`, `by`                            |

- The frontmatter `name` is the page title. The first paragraph after `#` is the summary.
- Goal states are the task statuses: `todo`, `backlog`, `started`, `review`, `done`, `duplicate`, `blocked`,
  `cancelled`, `failed`. A goal whose `blockedBy` names an open question shows as blocked.
- PR state and branch come from GitHub on each build (cached for 2 minutes): `draft`, `open`, `failing`, `merged`,
  `closed`. Write `status` only for what GitHub does not show: `landing` (the `land` skill drives it) and `queued` (the
  merge queue has it). A lookup that fails keeps the file's state and prints a warning; `--offline` skips it.
- A title has 12 words or fewer. A note has 25 words or fewer, at most 6 for each block.
- Ids are `Q-1`, `G-1`, `PR-1`, `D-1`, `T-1`, numbered in the order written.

## 3. Append-only

- Never edit or remove a `question`, a `decision` or an `event`. The build compares the file with its committed
  version (`git show HEAD:`) and fails on an edit.
- A question is answered by a new `decision` with `answers: Q-n`. When the user answers in chat, record it with
  `by: user:<their GitHub login>` (the `mdl` skill says how to find it).
- Add an `event` for each thing that happened: a PR opened, merged or failed, an answer, a goal done. Dates only go
  forward.
- Goals and PRs change in place: their state is the present, the timeline is the history.

## 4. Words

- Write every line in Simplified Technical English (`simplified-technical-english` skill). The build runs its checker
  on each line and reports findings with the line number.
- Write what is true for the user, not what you did: "The install works", not "I fixed the install".

## 5. Build and publish

```bash
node --conditions=source tools/session-board/src/cli.ts build
```

- It prints the page path. An error gives `file:line: message` and exits 1: fix the file and build again.
- STE findings are warnings. `--strict` makes them errors.
- Publish with the Artifact tool: `file_path` = that page path, `icon` = `checklist` on the first publish, and a
  one-sentence `description`. Publish the same path each time, so the URL stays.

## 6. The Stop hook

`.claude/hooks/status-board-stop.sh` runs at each Stop. With no current board it does nothing. It never blocks a stop
that a Stop hook already continued, so it cannot loop. Otherwise it blocks at most once:

- An invalid file: the errors. Fix them.
- A changed board: `STATUS BOARD: … Publish the page`. Publish it, then end the turn with one line.
- Work that changed (HEAD or the working tree) while the board did not: a reminder. Update the goal, PR or question
  and add an event, or end the turn if nothing on the board changed.

## 7. The chat reply

- After an update, reply in one or two lines: what changed, and "details on the board".
- Do not repeat the board in the chat.

## The prebuilt page

`tools/session-board` is the page: react-ui `Panel`, `Accordion`, `Listbox`, and the plugin-projects task UI from
`@dxos/react-ui-task` (`TaskList` for goals, `TaskQuestion` for questions, `TaskHistory` for the timeline). It is
always dark. Vite builds it into one HTML file with a `{{BOARD}}` placeholder; `cli.ts build` only fills it. The page
comes from:

1. `tools/session-board/dist/app/index.html`, when it is newer than its sources.
2. `~/.cache/dxos-session-board/template.html`, the last copy pulled from R2.
3. R2 (`session-board/refs/main.json` in `agent-artifacts`), pulled one time into that cache.

The **Session Board Cache** workflow builds the page on `main` and pushes it to R2. To change the page:

```bash
moon run session-board:build-page                                              # Vite build
node --conditions=source tools/session-board/src/cli.ts template push --ref <branch>   # share a branch build
node --conditions=source tools/session-board/src/cli.ts template pull                  # refresh the cached copy
```

The story `tools/session-board/Board` shows the sample session.

## Later

- The `mcp` capability lets the page call the viewer's claude.ai connectors: GitHub for live PR state, and the DXOS
  MCP servers. It is not used yet.
