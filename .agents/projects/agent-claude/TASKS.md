# Claude Agent SDK host — TASKS

See DESIGN.md for why the SDK is an agent rather than a model provider, the
three existing tree primitives, and the M1 permission posture.

## Status

M1 landed on branch `claude/tree-conversation-harness-7d9d49` (commits
`240ee96b48`, `b6f9f9299f`). Live end-to-end run verified via
`moon run agent-claude:demo`. M2 in progress.

## M1 — one turn, projected (DONE)

- [x] Scaffold `@dxos/agent-claude` (private, node-only).
- [x] `@anthropic-ai/claude-agent-sdk` + `@anthropic-ai/sdk` via catalog.
- [x] `Options.make` — `dontAsk`, read-only `allowedTools`, scoped denies,
      `settingSources: []`.
- [x] `Projection.Projector` — SDK frames → `ContentBlock`/`Message`; stateful
      because the SDK omits the tool name on results.
- [x] `Host.Session` — `query()` → `Stream<Message, AgentHostError>`.
- [x] 11 unit tests + live `Demo.test.ts` behind `DX_RUN_LIVE`.

## M2 — story driving the sidecar (IN PROGRESS)

Decisions (confirmed with burdon 2026-08-15):

- [x] Sidecar = vite middleware in `stories-assistant`, not a standalone
      process. Same origin, no CORS, works under `serve` and `test-storybook`.
- [x] Always live — no fixture replay — but **never runs in CI**
      (`tags: ['!test']` by default, lifted by the live env var; the moon task
      that sets it is `runInCI: false`).
- [x] New `Agent.stories.tsx`, not an extension of `Chat.stories.tsx` (which is
      built around `ScriptedLanguageModel`).
- [x] Absorb changes inside `plugin-assistant` if the denial assertion needs
      them.

Work:

- [x] External-turn path found: `Chat.feed` is a `Ref<Feed.Feed>`;
      `Feed.append(feed, items, { parent })` appends without going through
      `useChatProcessor`. No plugin-assistant change needed for plumbing.
- [ ] `Wire` — projected message in transit (ECHO objects are not transferable).
- [ ] Middleware — NDJSON stream over POST.
- [ ] `Agent.stories.tsx` — assert text, tool call/result pairing, and a denied
      call rendering as an error.
- [ ] Verify with `test-storybook` and report actual output.

## Backlog

- [ ] **Tree-based chat UI**: multiple threads via a sidebar selector, quick
      switching between them, and a common task list shared across branches.
      (tracked by burdon 2026-08-15 — this is M4.)
- [ ] `Projection` fidelity: `model` came back `undefined` on the live run
      because `soleModel` only reports when `modelUsage` has exactly one key.
      Needs a real `modelUsage` payload inspected.
- [ ] Standalone managed sidecar process for Composer proper, following the
      `Provider.builtIn` lifecycle.
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
