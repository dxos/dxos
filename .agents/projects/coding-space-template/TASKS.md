# coding-space-template — Tasks

_Resume: the template is rewritten and PR #13038 is open. The plan was then EXECUTED for real —
the chess MCP Worker is built, deployed with no Cloudflare account, and answering both tools over
the wire — which corrected three of the template's own claims (Phase 2a). Local verification is
delegated to CI: a 4-core sandbox cannot run the repo build and a browser at once. Outstanding is
Phase 3, the live-Composer walkthrough and its recording._

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

Local build and lint were started here and then **abandoned deliberately** in favour of CI: this
container is 4 cores, and running the repo build alongside a browser put the load average at 15 and
timed out Composer's own shared worker. CI runs the same jobs on real hardware, so it is the
authority for everything in this phase except the test, which did complete locally.

- [x] **Run the sample-space test** — `moon run plugin-debug:test -- src/sample/stockfish`, 4/4
      passing in 4.99s (195 moon tasks, so the dependency graph built as a side effect).
- [x] **Format** — `oxfmt` clean over 14,214 files.
- [ ] **Build and lint** — delegated to CI (`Check / check`). Not run to completion locally.
- [ ] **Boot-budget check** — delegated to CI (`Check / boot-budget`). Not run locally.
- [ ] **Open the preset in a running Composer** — see Phase 3; the dev server is up on **5173**
      (not 5199) and the app boots to a space, but the walkthrough is not captured yet.

## Phase 2a: What executing the plan taught it

The plan was written from reading the codebase. Running stages two and three of it for real —
`reference/chess-mcp/` is the Worker that came out — falsified or sharpened three of its claims.
All three are now folded back into the template.

- [x] **`--temporary` is not optional, and is now named.** Plain `wrangler deploy` refuses in a
      non-interactive shell and demands `CLOUDFLARE_API_TOKEN`; its own error text points at the
      flag. The task previously said wrangler "deploys with no account by minting a temporary one",
      which is true and unactionable.
- [x] **A wall-clock search budget is inert in a Worker.** `Date.now()` does not advance during
      synchronous compute, so the deadline never fires and the call reports `elapsedMs: 0`. Stage
      three now says to bound by work done, and the skill carries the general rule.
- [x] **The claim window is an hour**, stated rather than "expires".
- [x] **Deployed and verified over the wire** — `initialize` (protocol `2025-06-18`), `tools/list`,
      both tools, and a bad FEN correctly surfacing as `isError: true` rather than a JSON-RPC error.
      On the position the template seeds, `best_move` returns `Bxc6` in 1.4s. Transcript in
      [reference/chess-mcp/README.md](reference/chess-mcp/README.md).
- [x] **Confirmed `--temporary` end to end** — minted an account, printed a 60-minute claim URL, and
      served. Its `workers.dev` host is then behind a Cloudflare **managed challenge** from this
      container's egress IP, so the live demo Worker runs on the DXOS org account instead. That is
      an environment artifact, not a template defect.

## Phase 2b: Review round on #13038

Three findings from CodeRabbit, all real defects in what the template instructs rather than style
notes. Fixed in `5d6a7b18`.

- [x] **The claim URL was being filed as a project artifact.** `wrangler deploy --temporary` prints a
      Worker URL and a claim URL; the second is a bearer credential for the account. A project
      artifact replicates in plaintext to everyone in the space, and the skill's own credentials
      section forbids persisting a secret — so the template contradicted itself. The Worker URL is
      filed; the claim URL goes to the reader and is logged nowhere.
- [x] **"Deploy at the end of every stage" was wrong.** Stage one produces a design document with no
      Worker project in existence; stages four and five change no Worker code. Every stage is still
      verified; the two that change Worker code are the ones that deploy.
- [x] **Claiming the account is the reader's step.** It signs the account into theirs and needs a
      browser, so burying it in an unassigned deploy task misdescribed it. Now a fourth `USER` task,
      and the template's claim is the accurate one: no Cloudflare login is needed TO DEPLOY.
- [x] **The archive test asserts four reader-owned steps in order**, which is what makes the shape a
      regression test rather than a comment.

## Phase 3: Run it, and record it

The user's ask: a demo video of the template being built, deployed and the MCP server used, with a
second agent reviewing the video before it is submitted.

An earlier note here called this "blocked in the cloud sandbox: needs ... an outbound path for
`wrangler deploy`". **That was wrong** and is struck: `preview.dxos.network` and
`api.cloudflare.com` both answer from the shell, Chromium reaches external HTTPS with the proxy
flags the `cloud-sandbox` skill documents, and the deploy in Phase 2a went through. What is
actually hard here is CPU, not network.

- [x] **Deploy the MCP server the template describes** — done in Phase 2a, live and answering.
- [ ] **Walk the template through a live Composer** — create the space from the "Chess MCP on
      Workers" template, register the deployed URL as an `McpServer`, and ask the chess chat for the
      best move. Dev server is up on **5173**. First attempt starved: the app boots to
      `/w/<space>/home` but the shared worker times out opening a leader session at load 15 on 4
      cores. Retry with the box quiet.
- [ ] **Screenshot the create-space dialog and the seeded space** (project, five-stage task tree,
      BRIEF.md, board) — Phase 2's last item, folded in here since it needs the same live app.
- [ ] **Record the run** as a captioned `.webm` (`recording-demos` skill).
- [ ] **Have a second agent review the recording** before it is attached.
- [ ] **Publish the recording** to the `agent-artifacts` bucket (`hosting-artifacts` skill) and link
      it from the PR body rather than committing it.

### Known-unreachable segments, and the attempts that established it

Nothing is listed here yet. An entry earns its place only after two independent routes have been
tried and logged in `.claude/.autonomous-log.md`.
