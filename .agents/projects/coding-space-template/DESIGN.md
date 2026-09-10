# coding-space-template — Design

Companion to [TASKS.md](./TASKS.md). The mechanism this template is built on
(`@dxos/app-toolkit/SampleSpace`) is the `sample-spaces` project's; this file records the decisions
about the template's CONTENT.

## 1. What the template is for

It is the one sample space meant to be **run** rather than read. The others depict a project
mid-flight so a reader can see a populated Composer; this one ships a brief, a plan nothing has
started on, and the working preferences a chat needs, and the reader's own session produces the
rest. Its purpose is therefore a demo that reaches a deployed, callable service in one sitting.

Lives at `packages/plugins/plugin-debug/src/sample/stockfish`, offered as the
`org.dxos.plugin-debug.sample.stockfish` preset through
`plugin-debug/src/capabilities/sample-spaces.ts`.

## 2. Why the subject changed: chatroom → chess MCP server (2026-09-10, user)

The previous subject was a chatroom on Workers. A chatroom's definition of done is two browser tabs
talking, which is a screenshot and nothing else — the app it produces has no relationship to
Composer, so the run ends where the demo should start.

A chess engine behind an MCP server ends inside Composer instead: the last verification step is a
chat in the same space asking the deployed Worker for a move and getting a tool call back. The
deliverable is a capability the space gained, which is the thing worth showing.

## 3. The shape of the run, and why nothing in the middle needs an account

The original plan's second stage was "satisfy the prerequisites": create a GitHub repository,
connect a GitHub token, connect an Anthropic key, create and deploy a Claude managed agent, bind
`GH_TOKEN`. Five steps, three of them consent screens, all before a single line of code — and a
first run stops at whichever one the reader has not got.

The reshape removes the need for each rather than reordering them:

| Old dependency       | Replaced by                                                             |
| -------------------- | ----------------------------------------------------------------------- |
| Anthropic key        | DeepSeek V4 Pro through the DXOS edge — the reader's identity is enough |
| Claude managed agent | the assistant itself, coding in a remote sandbox                        |
| `wrangler login`     | wrangler's unauthenticated deploy, which mints a temporary account      |
| GitHub repo + token  | still needed, but moved to stage five — after the thing already works   |

What is left is five stages, in this order: design → deploy an empty Worker → implement the server
→ register it and use it from the chess chat → publish. The reader owns exactly three steps: pick
the model (a Composer setting a space cannot carry) and the two GitHub consent screens.

### 3.1 The assistant codes; it does not delegate (user, 2026-09-10)

The sandbox image ships DeepSeek's own coding harness, and `org.dxos.skill.deepseek` will run it.
Using it here is a category error and the skill says so explicitly: a delegated harness starts with
none of the space's context — no brief, no task tree, no design document — and writes to a container
filesystem instead of into the project, so the task list the reader is watching stops moving. The
assistant drives the sandbox directly through `org.dxos.skill.sandbox` and keeps its own loop,
context and transcript.

## 4. What is seeded, and what deliberately is not

Seeded: the brief (`BRIEF.md`), the five-stage task tree (all `todo`, each stage depending on its
predecessor), the Development skill, and a chess `Game` five moves into a Spanish opening.

The game is the one addition. The definition of done is a chat answering from the engine rather
than from what the model already knows, so the space has to ship a position to ask about — the
chess chat opens on a `Game`, and a FEN the reader must paste is a step that gets skipped. The
opening is quiet and has no forced tactic on purpose: a plausible answer produced without calling
the tool is then visibly not the engine's.

Not seeded: the design document (stage one's output — seeding it answers the question the project
exists to work through), the `McpServer` record (stage four; its `url` is required and there is no
URL until stage two deploys), and a repository (stage five).

## 5. Model selection is a setting, not space content

`Instructions` carries `skills` and `objects` but no model; the chat model resolves from
`Assistant.Settings.modelDefaults` per provider (`usePresets`). So a space cannot select DeepSeek V4
Pro for its reader. It is a reader-assigned task in stage one instead, and the project instructions
state that no Anthropic key is involved anywhere — which is what makes a wrong model visible as a
credential prompt rather than as a silent cost.

## 6. Dependencies this added to plugin-debug

`@dxos/plugin-chess` (for `Chess.State`) and `@dxos/plugin-game` (for the `Game` wrapper). Precedent
is the comment already at the top of `sample-spaces.ts`: sample content lives in plugin-debug rather
than in the plugins whose types it uses, because every consumer of it is plugin-debug's.
