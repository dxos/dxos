---
name: status-board
description: Keep one Artifact page as the user's view of a long session — questions, goals with their state, and pull requests — each item one short Simplified Technical English line that expands to its details. You write a Markdown file; `tools/session-board/src/cli.ts` checks it and fills a prebuilt react-ui page; you publish that page. Never write the HTML yourself. Use when the user asks for a status page, a session dashboard, an overview of the session, or a place where you put questions for them; when a session runs several PRs or subagents in parallel; when the user says your replies are too long; or when the Stop hook says `STATUS BOARD`.
---

# Status board

The user reads the board, not the chat. You write the board as Markdown. A script checks it and makes the page. You publish the page.

```
agents/sessions/<date>-<slug>.md  →  cli.ts build  →  .claude/.status-board/<name>.html  →  Artifact tool
   (you write, committed)            (parse, check)     (prebuilt page + data)              (you publish)
```

## 1. Start a board

```bash
node tools/session-board/src/cli.ts start agents/sessions/2026-11-21-session-board.md
```

- It writes the file from a skeleton if the file does not exist.
- It makes the file the current board, so the Stop hook builds it.
- Name the file `<YYYY-MM-DD>-<slug>.md`. Commit it with the work of the session.

## 2. Write the Markdown

```md
# Session board skill

The agent keeps one terse board. The chat stays short.

## Questions

- [open] Where do session files go?
  - Option 1: `agents/sessions/`, committed with the work.
  - Option 2: `.agents/sessions/`, beside the project registry.

## Goals

- [done] Parse the board Markdown into data.
  - `cli.ts build` writes the page in less than one second.
- [doing] Publish the page from the Stop hook.
  - The hook blocks the stop one time for each change.
    - An unchanged board does not block.

## Pull requests

- [draft] dxos/dxos#10450 Add the status board skill.
  - CI: the Check workflow passes.
```

- `#` is the title, 8 words or fewer. One line under it is the summary.
- Each `##` is a section, shown in file order. Put **Questions** first.
- Each item is `- [state] line`. The line has 12 words or fewer.
- A detail is a bullet two spaces in, 25 words or fewer, at most 6 for each item. A sub-detail is four spaces in.
- Inline: `code`, **bold**, `[text](url)`, a bare URL, and `owner/repo#123` (a PR link).
- `<!-- comments -->` are ignored.

States, by section heading:

| Section         | States                                                   |
| --------------- | -------------------------------------------------------- |
| `Questions`     | `open`, `answered`                                       |
| `Goals`         | `todo`, `doing`, `done`, `blocked`, `dropped`            |
| `Pull requests` | `draft`, `open`, `failing`, `queued`, `merged`, `closed` |
| any other       | the goal states, or no state                             |

`[x]` and `[ ]` are aliases for `done` and `todo`.

## 3. Words

- Write every line in Simplified Technical English (`simplified-technical-english` skill). The build runs its checker on each line and reports findings with the line number.
- Write what is true for the user, not what you did: "The install works", not "I fixed the install".
- A question holds its options as numbered details: `Option 1: …`, `Option 2: …`.
- Move an item, do not copy it. An answered question stays, with state `answered` and the answer as a detail.
- Put the proof in the details: the command, the number, the link.
- No history of the session and no paragraphs. The details are the place for depth, and they are bullets too.

## 4. Build and publish

```bash
node tools/session-board/src/cli.ts build
```

- It prints the page path, `.claude/.status-board/<name>.html`. An error gives `file:line: message` and exits 1: fix the Markdown and build again.
- STE findings are warnings. `--strict` makes them errors.
- Publish with the Artifact tool: `file_path` = that page path, `icon` = `checklist` on the first publish, and a one-sentence `description`. Publish the same path each time, so the URL stays.
- The page is one self-contained file, so a publish sends only it.

## 5. The Stop hook

`.claude/hooks/status-board-stop.sh` runs at each Stop. With no current board it does nothing.

- An invalid board blocks the stop with the errors. Fix them.
- A changed board blocks the stop one time, with `STATUS BOARD: … Publish the page`. Publish it, then end the turn with one line.
- An unchanged board does not block. The hook keeps the hash of the last board it asked you to publish.

Update the Markdown each time a PR changes state, a subagent reports, a goal changes state, or the user answers a question. The hook makes sure that the page follows.

## 6. The chat reply

- After an update, reply in one or two lines: what changed, and "details on the board".
- Do not repeat the board in the chat.

## The prebuilt page

The page is `tools/session-board` (react-ui `Accordion`, `Tag`, `Typography`), built by Vite into one HTML file with a `{{BOARD}}` placeholder. `cli.ts build` only fills the placeholder, so it needs no bundler. It takes the page from:

1. `tools/session-board/dist/app/index.html`, when it is newer than its sources.
2. `~/.cache/dxos-session-board/template.html`, the last copy pulled from R2.
3. R2 (`session-board/refs/main.json` in `agent-artifacts`), pulled one time into that cache.

The **Session Board Cache** workflow builds the page on `main` and pushes it to R2. To change the look:

```bash
moon run session-board:build-page                        # Vite build, ~3 s once its dependencies are built
node tools/session-board/src/cli.ts template push --ref <branch>   # optional: share a branch build
node tools/session-board/src/cli.ts template pull                  # refresh the R2 copy in the cache
```

The story `tools/session-board/Board` shows the sample board. The format lives in `src/parse.ts` and its tests.
