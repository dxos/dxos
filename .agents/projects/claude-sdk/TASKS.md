# Claude Agent SDK host — TASKS

See DESIGN.md for why the SDK is an agent rather than a model provider, the
three existing tree primitives, and the M1 permission posture.

## Status

M1 and M2 landed on branch `claude/tree-conversation-harness-7d9d49` (commits
`240ee96b48`, `b6f9f9299f`, `4faed14287`). Live end-to-end runs verified via
`moon run agent-claude:demo` and `moon run stories-assistant:test-storybook-live`.
NEXT: M3 (permission surface).

## M1 — one turn, projected (DONE)

- [x] Scaffold `@dxos/agent-claude` (private, node-only).
- [x] `@anthropic-ai/claude-agent-sdk` + `@anthropic-ai/sdk` via catalog.
- [x] `Options.make` — `dontAsk`, read-only `allowedTools`, scoped denies,
      `settingSources: []`.
- [x] `Projection.Projector` — SDK frames → `ContentBlock`/`Message`; stateful
      because the SDK omits the tool name on results.
- [x] `Host.Session` — `query()` → `Stream<Message, AgentHostError>`.
- [x] 11 unit tests + live `Demo.test.ts` behind `DX_RUN_LIVE`.

## M2 — story driving the sidecar (DONE, `4faed14287`)

Decisions (confirmed with burdon 2026-08-15):

- [x] Sidecar = vite middleware in `stories-assistant`, not a standalone
      process. Same origin, no CORS, works under `serve` and `test-storybook`.
- [x] Always live — no fixture replay — but **never runs in CI**. Implemented as
      `tags: ['manual']` + a `DX_RUN_MANUAL_TESTS` gate in the storybook tag
      config; the moon task that sets it is `runInCI: false`. (The first attempt,
      a computed `!test` tag, broke storybook's static indexer.)
- [x] New `Agent.stories.tsx`, not an extension of `Chat.stories.tsx` (which is
      built around `ScriptedLanguageModel`).
- [x] Absorb changes inside `plugin-assistant` if the denial assertion needs
      them.

Work:

- [x] External-turn path found: `Chat.feed` is a `Ref<Feed.Feed>`;
      `Feed.append(feed, items, { parent })` appends without going through
      `useChatProcessor`. No plugin-assistant change needed for plumbing.
- [x] `Wire` — projected message in transit (ECHO objects are not transferable).
- [x] Middleware — NDJSON stream over POST, mounted by the vite plugin.
- [x] `Agent.stories.tsx` — asserts rendered text, `Read` call/result still
      correlated by name across the transport, and the refused `Bash` call as an
      errored result counted in `permission_denials`.
- [x] Verified: `test-storybook-live` 31/31; plain `test-storybook` 8 passed |
      1 skipped. No `plugin-assistant` change was needed.

M2 gotchas worth remembering:

- The plugin must attach to **every** vitest project — the storybook project's
  server serves the story to chromium, not the root one.
- Vite bundles a config file's static imports as CJS `require`, and
  `@dxos/agent-claude` is ESM-only, so the middleware is imported dynamically
  inside `configureServer`.
- **Storybook tags are not vitest tags.** `tags: ['manual']` is inert against
  `vitest.tags.ts`; the `DX_RUN_MANUAL_TESTS` gate is repeated in
  `vite.base.config.ts`'s storybook tag config. A _computed_ `tags` expression
  breaks storybook's static indexer outright.
- `storybook/test`'s `expect` is jest-style and returns a promise — `.to.be.true`
  type-errors and un-awaited assertions trip `no-floating-promises`.

## RESOLVED — the render path was never broken (2026-08-15)

`Feed.append` onto `Chat.feed` renders in the existing Chat surface. The M2 claim
stands. Three successive diagnoses were wrong; the actual fault was in the test.

What settled it — dumping every stage instead of theorising:

```
DIAG {"appended":9,"feedQuery":9,"reachable":9,
      "domChars":1309,"domHasToken":true,
      "domSample":"… I'll read the fixture file first. Calling Read Success Read …"}
```

Messages reach the feed, the reactive query returns them, `Feed.history` keeps
them, and they ARE in the DOM.

The assertions were at fault, twice over:

1. **Scope.** `within(canvasElement)` does not see the thread — the module layout
   renders outside the story root. `document.body` does.
2. **Matcher.** `findByText` is ambiguous here: the token appears in both the tool
   result and the assistant's prose, and markdown splits text across nodes.
   Asserting on `document.body.innerText` is what works.

Retracted, so nobody rebuilds on them:

- ~~"`AiChatProcessor.messages` reads in-memory atoms, never the feed."~~ `Chat.tsx`
  composes `feedMessages` (a reactive query) with the processor's atoms.
- ~~"`AgentService` is the only supported door."~~ It is how the assistant drives a
  turn, not a precondition for a message rendering.
- `AiChatProcessor.present()` was added on the first of these and has been
  **removed** along with the `getChatProcessor` story hook.

CONSEQUENCE FOR M3c: no new seam is needed. Routing Composer's chat input to the
sidecar plus `Feed.append` is the whole job. The ~1,100-line `AgentService`
route is only required if a turn must join process lifecycle (cancellation,
hydration, delegation, background tools).

METHOD: five hypothesis-driven attempts failed here; one staged dump ended it.
Dump state before the second hypothesis.

## M3 — a turn you can watch (M3a + interactive UI DONE)

**ACHIEVED 2026-08-15: you can talk to the Claude Agent SDK from a UI.**
`AgentConsole.stories.tsx` — prompt box, streamed transcript, tool calls and
denials colour-coded, session id, Fork button. Verified by driving it in a real
`storybook dev` on 9016: a turn read the fixture off disk and answered
`pelican-42`; a follow-up answered from session memory in 9 tokens with no tool
calls, same session id (continuation, not restart).

How to run it:

```shell
DX_AGENT_CWD=$PWD/packages/stories/stories-assistant/src/testing/fixtures \
  pnpm --filter @dxos/storybook-react exec storybook dev --port 9016 --no-open
```

Then open `stories-assistant/AgentConsole`. The `storybook-agent` entry in
`.claude/launch.json` does the same.

DESIGN NOTE: the console renders projected `ContentBlock`s directly instead of
going through the assistant's `Chat` surface. That sidesteps M3b entirely — the
Chat surface reads a processor's in-memory atoms and cannot show an externally
produced turn. M3b remains open for the case where the turn must appear in the
REAL chat UI; the console proves the harness end to end without it.

## M3 original plan

Goal: a human opens a UI, triggers a turn, and sees it appear. Split so the
watchable part does not depend on the unresolved part.

**Working rules for this milestone** (written before starting, because ignoring
them is what burned the previous session):

- **Diagnose before the second hypothesis.** On any non-obvious failure, dump the
  relevant state (frames, atom contents, whether the handle is even defined)
  before forming another theory. Five hypothesis-driven attempts failed on the
  render bug; one dump solved the sibling bug in a single run.
- **Build the cheap loop first.** The live story is ~60s and spends real tokens.
  Nothing may be iterated on it until a seconds-long loop exists.
- **No scope additions mid-milestone.** The client extraction in the previous
  session was unnecessary and introduced a red herring.

### M3a — mount the sidecar in `storybook dev` (small, independent)

`tools/storybook-react/.storybook/main.ts` builds its own vite config in
`viteFinal` and never loads a package's `vite.config.ts`, so the middleware is
absent from the interactive storybook. Add it there, guarded so it only mounts
when the agent host is wanted.

- [x] Mount the middleware in `viteFinal` (opt-in via `DX_AGENT_CWD`).
- [x] Verified by hand: the Agent story on port 9016 ran a real turn.
- [x] Exit met: the owner can watch a real turn without waiting on M3b.

### M3b — the render path

Root cause is known (see the FINDING section): `AiChatProcessor.messages` reads
in-memory atoms, never the feed. `present()` has landed and is necessary but not
sufficient.

- [ ] **Cheap loop first**: a storybook story (or node test) that mounts the chat
      and calls `present()` with a hand-built message — no SDK, no network.
      Seconds per run. Everything below iterates on this.
- [ ] Dump, in this order, before theorising: does `getChatProcessor()` return a
      processor inside the play function; does `processor.messages` contain the
      message after `present()`; does the component re-render.
- [ ] Fix whatever that shows. Leads (UNTESTED): module-instance split across the
      story boundary; the `Chat` component subscribing through a different atom
      registry than the story renders with; `#pending` reset by the processor
      lifecycle.
- [ ] Restore the DOM assertion in `Agent.stories.tsx` and confirm green live.
- [ ] Exit: the live story asserts the rendered thread again, and the M2 claim
      about the render path is true rather than withdrawn.

### M3c — invoke it from Composer's chat (blocked on M3b)

- [ ] Route the Assistant chat input to the sidecar so a typed prompt runs a turn.
- [ ] Exit: burdon types in Composer and sees the agent answer.

## M3c — IN PROGRESS (2026-08-15)

DONE and green:

- [x] `TurnProducer` factoring in `agent-runtime` (`turn-producer.ts`) — two
      members plus an optional lifecycle; `AiSession.Session` satisfies it
      structurally, so the default path is unchanged. `agent-process` takes
      `makeTurnProducer`; `AgentServiceOptions` threads it through.
      agent-runtime 30 passed | 19 skipped.
- [x] `@dxos/agent-claude/producer` — reaches the host over HTTP, appends each
      streamed message to the feed, replays history via the SDK's `resume`.
      Binds no DXOS skills (the SDK owns tool binding).
- [x] `AssistantCapabilities.AgentTurnProducer` — a registry mirroring
      `AgentDelegationStrategy`, read by `AgentServiceSpec` when its layer
      materializes.
- [x] `AgentClaudePlugin` in the story harness contributing it at Startup.

BLOCKED — `WithClaudeAgent` does not work:

With the producer contributed the story never reaches a space or a chat (60s,
both waits time out), while `WithSidecar` — the same plugin stack without the
producer — passes. **The producer module never appears in the activation log**,
so the suspicion is that it does not activate at all rather than that it fails.

The story is tagged `!test` so the suite stays green rather than red; it is an
artifact for the next session, not a passing test.

DIAGNOSED (2026-08-16, `agent-claude-plugin.test.ts`): leads 1 and 3 are
ELIMINATED — in a bare `PluginManager` the plugin activates on Startup and the
producer contribution is visible (`2 passed`). Two "Not a valid effect" errors
seen on the way were the diagnostic's own bug: `manager.capabilities.getAll` is
SYNCHRONOUS, and casting it to an effect handed `Effect.runPromise` a plain
array (an array's toString printed the function source, then `[object Object]`).
A record-wrapper "fix" made on that false reading was reverted.

RESOLVED (2026-08-16): after the Scope/`runTurn` refactor (dmaretskyi's review)
and the merge with main, all three checkpoints fire — module activates,
`AgentServiceSpec` sees 1 producer, story reaches the chat. The original stall
was never reproduced against the new seam, so its precise cause is unknown; it
is gone.

**M3c COMPLETE.** `WithClaudeAgent` types a prompt into the assistant's OWN chat
input; the processor requests a session from `AgentService`, the process runs
the turn on the contributed Claude producer (HTTP to the sidecar, real SDK), the
projected messages land on the feed, and the thread renders the fixture token.
In-suite: 34 passed, With Claude Agent 9655ms.

One more shared-state bug found by running the full suite: `storySpace` was a
single module-level slot, so a later story in the file picked up the PREVIOUS
story's space — client already destroyed — and hung both waits (passed alone,
failed in-suite at 60s). Captures are now keyed per story.

## Backlog

- [ ] **Tree-based chat UI**: multiple threads via a sidebar selector, quick
      switching between them, and a common task list shared across branches.
      (tracked by burdon 2026-08-15 — this is M4.)
- [ ] **Multitasking UI for human + agent**: fast iteration on spec/design in the
      foreground while an experiment runs in the background. The point of the
      tree is not just seeing branches — it is that a slow branch keeps running
      while the human works a fast one. (tracked by burdon 2026-08-15; shapes
      M4's requirements.)
- [ ] `Projection` fidelity: `model` came back `undefined` on the live run
      because `soleModel` only reports when `modelUsage` has exactly one key.
      Needs a real `modelUsage` payload inspected.
- [ ] Standalone managed sidecar process for Composer proper. **The host already
      exists** (tracked by burdon 2026-08-16): `composer-app/src-tauri` is a
      Tauri native app that bundles a local model runtime as a Tauri sidecar —
      `tauri.conf.json` declares `externalBin: ["sidecar/ollama"]` plus its
      Metal framework, fetched by `scripts/fetch-ollama.mjs`. So production
      process supervision is a solved problem in-tree: the Claude SDK host
      becomes a second Tauri sidecar (or a Rust-spawned node process) rather
      than a new `Provider.builtIn`-style manager, and the wire protocol,
      client, and producer carry over unchanged since they already speak HTTP.
- [ ] Permission surface (M3), designed from collected `permission_denials`.

## Notes

- Direct `pnpm --filter <pkg> exec vitest run` fails repo-wide with
  `"./unstable/reactivity/Atom" is not exported` —
  `packages/common/effect/node_modules/effect` is 3.21.4 against root
  4.0.0-rc.108. Use `moon run <pkg>:test`, which builds deps first.
  `@dxos/mcp-server` fails identically, so it predates this branch.
- Effect 4 differences that cost build cycles: `Option.fromNullable` →
  `fromNullishOr`; `Stream.filterMap` takes a `Filter`, not an Option-returning
  function (use `Stream.map` + refinement `Stream.filter`);
  `Effect.runPromise` is banned by lint in favour of `EffectEx.runPromise`.
