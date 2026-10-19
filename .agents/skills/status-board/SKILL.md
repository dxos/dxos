---
name: status-board
description: Keep one Artifact page as the user's view of a long session — questions for the user first, then work in progress, then work done — each item one short Simplified Technical English line that expands to its details. Use when the user asks for a status page, an overview of the session, or a place where you put questions for them; when a session runs several PRs or subagents in parallel; or when the user says your replies are too long.
---

# Status board

The user reads the board, not the chat. Keep it current, keep it short, and put every question there.

## The page

- One Artifact page for the session. Publish it once, then update it at the same file path so the URL stays.
- Three sections, in this order:
  1. **Questions for you**: decisions only the user can make. Put the question in the line itself.
  2. **In work**: PRs, subagents, deploys and tests that are running.
  3. **Done**: results, with the PR link or URL.
- An empty section stays, with one line: "No questions now."
- A header line: the session subject and the time of the last update (UTC).

## Each item

- One line of 12 words or fewer, in Simplified Technical English (`simplified-technical-english` skill). Run its `scripts/ste_check.py` on the lines.
- The line is the `<summary>` of a `<details>` element. The details hold 1–4 short STE sentences: the cause, the command, the number, the link.
- Show proof in the details when a picture answers the question faster than words: a screenshot or a before/after pair, embedded as a `data:` URI or an uploaded asset.
- Write what is true for the user, not what you did. "The skill install works", not "I fixed the install".
- Move an item, do not copy it. An answered question goes to **Done** with the answer.

## When to update

- Each time a PR merges, fails, or changes state, a subagent reports, or the user answers a question.
- Before you end a turn that changed anything on the board.

## The chat reply

- After an update, reply in one or two lines: what changed, and "details on the board".
- Do not repeat the board in the chat.

## Look

- Follow the `artifact-design` guidance: theme tokens for light and dark, a 16px side gutter, readable at phone width.
- A colored dot per section: orange for questions, amber for in work, green for done.
- No tables of numbers, no paragraphs, no history of the session.
