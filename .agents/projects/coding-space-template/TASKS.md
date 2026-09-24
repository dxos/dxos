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

## Phase 2c: Adversarial review of the diff

A subagent asked to attack the change returned twelve findings. Four were already fixed, one was
declined, and these are the rest. Fixed in `69b11633` and `072e3136`.

- [x] **Stage four's definition of done was unreachable in a default Composer.** `ChessPlugin` is
      available but appears in no default-enabled list, so the seeded `Game` has no board — and
      opening it is how the stage proves the engine answered. Enabling it is now a reader step, which
      makes five.
- [x] **The claim task was in the wrong stage — my error, not the reviewer's.** Moved to after the
      LAST redeploy: a claimed account is one the unauthenticated agent cannot update, and
      `--temporary` refuses when logged in, so a later deploy would mint a second account under a
      different URL and break the registration stage four performs.
- [x] **Two assertions proved nothing.** `countOf` substring-matches, so a zero-count passes just as
      well when the typename is misspelled. Replaced with one that cannot be wrong about extras:
      every typename in the archive must be one `definition.schemas` declared.
- [x] **That assertion then found two real gaps** — which is the point of it. `spaceProperties` is
      the harness's space root and no phase's to declare (exempted); `Outline` is created inside
      `Project.make`, and **none of the three sample spaces declared it**. Declared here; the
      siblings are out of scope but this template cannot regress the same way again.
- [x] **The changesets double-reported the template** and neither named the breaking removal of
      `ChatroomSpace` from the public `./sample` entry. Both fixed.
- [x] **The registry `resume` contradicted this file**, still claiming Phase 3 was blocked on network
      access that demonstrably works. Rewritten from reality.
- [x] Smaller: the position is "materially level", not "symmetrical"; a dead `parent !== undefined`
      clause removed; the `index.ts` icon comment no longer claims something untrue of the app.
- [x] **`moon run plugin-debug:test -- src/sample/stockfish` — 4 passed (4).**

Declined: the `Text.Text` schema declaration is inconsistent between the docs and skill phases, but
the sibling sample spaces are inconsistent both ways and the archive proves the current declarations
sufficient. Not worth the churn.

## Phase 3: Run it, and record it

The user's ask: a demo video of the template being built, deployed and the MCP server used, with a
second agent reviewing it before submission.

**Where this landed: everything except the video, and the video is blocked by a measured cause.**

- [x] **Deploy the MCP server the template describes** — built, deployed with
      `wrangler deploy --temporary` on no Cloudflare account, and answering `initialize`,
      `tools/list` and both tools over the wire. On the seeded position `best_move` returns `Bxc6`
      in 1.4s. Kept in [reference/chess-mcp](reference/chess-mcp/).
- [x] **Walk the template through a live Composer** — the create-space dialog lists "Chess MCP on
      Workers" with its description alongside the other three templates, and creating from it yields
      a space of 41 objects with the project, the root task and the five stages. Screenshotted.
- [ ] **Record it as a captioned `.webm`** — NOT achievable in this container. See below.
- [ ] **Have a second agent review the recording** — moot without one. A subagent did review the
      diff adversarially (Phase 2c).
- [ ] **Publish and link from the PR** — moot without a recording.

### The recording is blocked by the act of recording, and here is the measurement

Six attempts. Three separate real causes were found and fixed along the way, and the fourth is the
one that does not yield:

1. **Orphaned chromium.** Scripts I killed mid-flight left 22 chromium processes starving a 4-core
   box to load 9. Reaped.
2. **Contention with the build.** Video capture plus a `moon` dependency-graph rebuild on 4 cores
   times out the app's boot. Serialised; capture also dropped from 1440x900 to 1280x800.
3. **A stale vite dep pre-bundle.** After the bot merged `main`, the long-running dev server was
   still serving a pre-bundled `@dxos/protocols` from before #13036, so
   `dist/src/buf/index.js` "does not provide an export named `anyPackBare`" and every plugin
   depending on the client failed to activate — Composer's System Error boundary. Fixed by
   clearing `node_modules/.vite` and restarting; the error is gone.
4. **The one that does not yield.** With the above fixed, the app fails at
   `WorkerConnectionError: Worker connection timed out after 15000ms: opening worker leader
 session`, then `client services failed to open` and the fatal dialog. **That 15s is a fixed
   deadline**, and ffmpeg capture (~60% of a core, of four) pushes shared-worker leader election
   past it. With no capture running, the same walkthrough boots in 24s and completes.

So it is the recording itself that breaks the app here, not the app and not the template. A machine
with more cores — or a capture path that does not compete with the browser — gets the video with the
script already written
([scripts/record-tmp.mjs](../../../.agents/projects/coding-space-template/reference/)); nothing about
the template needs to change for it.
