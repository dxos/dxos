# coding-space-template — Tasks

_Resume: the template is rewritten (chatroom → chess MCP server) and its test updated. Not yet
built or run — the cloud sandbox had no `node_modules`, so setup was running when this was
written. The demo video is NOT done; see Phase 3._

The runnable sample space in `plugin-debug` — the one a reader is meant to execute rather than
read. Decisions and rationale live in [DESIGN.md](DESIGN.md); this file is the ledger.

## Phase 1: Reshape the template

- [x] **Rename the template `chatroom` → `stockfish`, and its export `ChatroomSpace` →
      `StockfishSpace`** — same slot, wholly new content, no compatibility re-export
      ([sample/stockfish](../../../packages/plugins/plugin-debug/src/sample/stockfish),
      [sample-spaces.ts](../../../packages/plugins/plugin-debug/src/capabilities/sample-spaces.ts)).
- [x] **Rewrite the brief** for a chess engine exposed as an MCP server on one Worker, with the
      constraints that keep the run credential-free
      ([docs.ts](../../../packages/plugins/plugin-debug/src/sample/stockfish/docs.ts)).
- [x] **Rewrite the plan as five stages, GitHub last** — design, deploy an empty Worker, implement
      the server, register and use it from the chess chat, publish. The old "satisfy the
      prerequisites" stage is gone rather than moved
      ([tasks.ts](../../../packages/plugins/plugin-debug/src/sample/stockfish/tasks.ts)).
- [x] **Cut the Claude managed-agent section from the Development skill** and replace it with
      "Where the code is written" (drive the sandbox directly; do not delegate to the harness in
      the image), "Deploying to Cloudflare" (unauthenticated deploy, claim the account), "Models and
      credentials" (DeepSeek via the edge, no Anthropic key) and "MCP servers" (register as `http`,
      prove the tool was called)
      ([skill.ts](../../../packages/plugins/plugin-debug/src/sample/stockfish/skill.ts)).
- [x] **Seed a chess `Game` as the position the finished server is pointed at** — five moves into a
      Spanish opening, so an answer produced without the tool is visibly not the engine's
      ([game.ts](../../../packages/plugins/plugin-debug/src/sample/stockfish/game.ts)).
- [x] **Bind the game into the project's instruction objects** and state the no-delegation and
      no-Anthropic rules in the instruction text
      ([project.ts](../../../packages/plugins/plugin-debug/src/sample/stockfish/project.ts)).
- [x] **Update the archive-shape test** — five stages, the three reader-assigned steps in order, the
      game and chess state present, no `McpServer` and no repo
      ([sample.test.ts](../../../packages/plugins/plugin-debug/src/sample/stockfish/sample.test.ts)).
- [x] **Add `@dxos/plugin-chess` and `@dxos/plugin-game` to plugin-debug**, and fix the stale
      "Coding Chatroom" mention in `stories-assistant`.

## Phase 2: Verify

- [ ] **Build and typecheck `plugin-debug`.**
- [ ] **Run the sample-space test** (`moon run plugin-debug:test -- src/sample/stockfish`).
- [ ] **Format** (`pnpm format`) and lint.
- [ ] **Boot-budget check** — the sample content rides its own lazy chunk; confirm
      `composer-app:check-boot-budget` is unchanged.
- [ ] **Open the preset in a running Composer** and confirm the create-space dialog offers it and
      the seeded space renders: project, task tree, brief, game.

## Phase 3: Run it, and record it

The user's ask: a demo video of the template being built, deployed and the MCP server used, with a
second agent reviewing the video before it is submitted.

- [ ] **Execute the template end to end** in a Composer with DeepSeek V4 Pro selected and the
      Sandbox plugin enabled. Blocked in the cloud sandbox: needs a signed-in DXOS identity for the
      edge model, a sandbox service, and an outbound path for `wrangler deploy`.
- [ ] **Record the run** as a captioned `.webm` (`recording-demos` skill), covering: the space
      created from the template, the task list moving as stages complete, the Worker URL answering,
      the `McpServer` record added, and the chess chat's tool call.
- [ ] **Have a second agent review the recording** before it is attached.
- [ ] **Publish the recording** to the `agent-artifacts` bucket (`hosting-artifacts` skill) and link
      it from the PR body rather than committing it.
