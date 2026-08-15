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

## FINDING — `Feed.append` alone does NOT render in the Chat surface

Established 2026-08-15 by dumping the projected frames instead of guessing. Two
separate problems were tangled:

1. **Test bug (FIXED).** The SDK's `Read` requires an absolute path, so the
   agent's first relative attempt fails and it retries. The story asserted on the
   FIRST `Read` call, whose result carries that error. It now selects the
   succeeding pair. With the render assertion removed the story is green
   (19053ms, no retry, 31/31).
2. **Real defect (OPEN).** With that fixed, the DOM assertion STILL fails: the
   messages are on `Chat.feed`, the projection is correct, and the thread does
   not show them. **So the M2 claim that projected messages render in the
   existing Chat surface with no plugin change is FALSE as it stands.** Writing
   to `Chat.feed` is necessary but not sufficient — `useChatProcessor` evidently
   owns something more (a queue, a `threadId` partition, or a reactivity path)
   that an external writer has to participate in.

This is what the M2 milestone was meant to discover, and it lands the
`plugin-assistant` change that option 4 budgeted for back on the table.

NEXT: read `useChatProcessor` and the `Chat` component to find what the surface
actually subscribes to, then either write through that path or contribute the
missing one.

## Superseded — earlier regression notes (2026-08-15)

`moon run stories-assistant:test-storybook-live` fails. It was green at
`4faed14287`/`92c988b1bf` (13045ms, no retry) and broke while extracting the
browser client and reworking assertion 1. **CI is unaffected** — the story is
`manual`-tagged and excluded from `test-storybook`.

Diagnoses tried and DISPROVEN, so nobody repeats them:

1. Model phrasing — asserting the literal `DONE` was genuinely fragile, but
   replacing it did not fix the failure.
2. Markdown rendering splitting text nodes — normalising both sides did not fix
   it.
3. Dual `@dxos/types` instance via the client subpath — moving `Message.make`
   back into the story did not fix it.
4. Making the client fully dependency-free — did not fix it.
5. Resource contention from a concurrent composer dev server — fails identically
   without it.

Current state: with the DOM assertion removed entirely it STILL fails at ~45s,
which means the failure is now in assertion 2 or 3 (Read call/result
correlation, or the denial), not rendering. Two separate problems are likely
tangled. The prompt also changed (asks for MAGIC_TOKEN) and `maxTurns: 8` may end
the run before Bash is attempted, leaving `denied` undefined.

NEXT: run it once with the frames dumped to console before assuming anything.
The clean alternative is reverting `Agent.stories.tsx` to `92c988b1bf` (needs
burdon's approval — never revert uncommitted work unasked) and re-landing the
client extraction separately.

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
