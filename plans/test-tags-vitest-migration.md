# Test Tags → Native Vitest Tags Migration

Migrate the repo's bespoke test-tagging system (`DX_TEST_TAGS` env var,
`@dxos/effect/testing`'s `TestTag` / `TestHelpers.taggedTest` /
`TestHelpers.tagEnabled`, and `describe.runIf(process.env.DX_TEST_TAGS?.includes(...))`
patterns) to Vitest 4's native `tags` API.

## Audit

Vitest 4.1+ ships native test tags
(see [Test Tags guide](https://main.vitest.dev/guide/test-tags.html)).
Tags are declared in `vitest.config.*` and applied per-test/per-suite via the
`tags` option, then filtered at the CLI with `--tagsFilter` (boolean expressions
of `&&`, `||`, `!`, `*`, parentheses).

### Custom code to remove

`packages/common/effect/src/testing.ts` defines:

- `export type TestTag = 'flaky' | 'llm' | 'sync'` — the tag union.
- `TestHelpers.tagEnabled(tag)` — `process.env.DX_TEST_TAGS?.includes(tag)`.
- `TestHelpers.taggedTest(tag)` — `Effect.fn`-pipeable operator that calls
  `ctx.skip()` when the tag isn't set.

`TestHelpers.runIf` / `skipIf` / `provideTestContext` and `TestContextService`
are _not_ tag-related and stay.

### Test files using `TestHelpers.taggedTest(...)`

| File                                                                                      | Tag     |
| :---------------------------------------------------------------------------------------- | :------ |
| `packages/core/ai/src/effect-ai-tools.test.ts` (×2)                                       | `llm`   |
| `packages/core/ai/src/effect-ai.test.ts` (×9)                                             | `llm`   |
| `packages/core/ai/src/resolvers/ChatCompletionsAdapter.test.ts` (×2)                      | `llm`   |
| `packages/core/ai/src/resolvers/ollama/OllamaResolver.test.ts` (×4)                       | `llm`   |
| `packages/core/mcp-client/src/McpToolkit.test.ts` (×2)                                    | `llm`   |
| `packages/core/assistant/src/session/session-ollama.test.ts`                              | `llm`   |
| `packages/core/assistant-toolkit/src/blueprints/design/blueprint.test.ts`                 | `llm`   |
| `packages/core/assistant-toolkit/src/blueprints/planning-old/blueprint.test.ts`           | `llm`   |
| `packages/core/assistant-toolkit/src/blueprints/research/functions/research.test.ts`      | `flaky` |
| `packages/core/assistant-toolkit/src/blueprints/discord/functions/fetch-messages.test.ts` | `sync`  |
| `packages/core/assistant-toolkit/src/blueprints/linear/functions/linear.test.ts`          | `sync`  |
| `packages/core/assistant-toolkit/src/blueprints/browser/blueprint.test.ts`                | `sync`  |

`packages/plugins/plugin-assistant/src/operations/prompt.test.ts` uses
`test.runIf(TestHelpers.tagEnabled('llm'))(...)` — same tag, different shape.

### Test files using `describe.runIf(process.env.DX_TEST_TAGS?.includes(...))`

| File                                                                         | Tag             |
| :--------------------------------------------------------------------------- | :-------------- |
| `packages/core/functions-testing/src/cpu-limit.test.ts`                      | `functions-e2e` |
| `packages/plugins/plugin-script/src/testing/simulator.test.ts`               | `functions-e2e` |
| `packages/plugins/plugin-script/src/e2e/ai.test.ts` (`.skip` chained)        | `functions-e2e` |
| `packages/plugins/plugin-script/src/e2e/deploy.test.ts`                      | `functions-e2e` |
| `packages/plugins/plugin-inbox/src/operations/google/gmail/sync-e2e.test.ts` | `functions-e2e` |
| `packages/sdk/client/test/e2e/sync.test.ts`                                  | `sync-e2e`      |
| `packages/sdk/client/test/e2e/edge-recovery.test.ts`                         | `sync-e2e`      |

### Comments / docs referencing `DX_TEST_TAGS`

- `packages/sdk/observability/test/e2e/tracing-invitation.test.ts` (header
  comment, suite uses `describe.skip`).
- `packages/core/assistant/src/session/session-ollama.test.ts` (header comment).
- `.github/workflows/README.md` (flaky-vs-quarantine table).

### Harness

`packages/core/assistant-e2e/src/harness.ts` exposes an `AgentTestOptions.testTag`
field of type `TestTag`, applied via `TestHelpers.taggedTest(...)` inside the
returned `Effect.fnUntraced` pipeline. Its sole call-site is
`packages/core/assistant-e2e/src/testing/local-ai.test.ts` (`testTag: 'llm'`).

### CI / build configuration

- `.github/workflows/check.yml`: `test` job sets `env.DX_TEST_TAGS: 'flaky'`.
- `packages/plugins/plugin-script/moon.yml`: `e2e` task sets
  `env.DX_TEST_TAGS: functions-e2e`.

## Tags taxonomy

Six tags are in use across the repo and will be declared in the shared Vitest
config:

| Tag             | Description                                                         |
| :-------------- | :------------------------------------------------------------------ |
| `flaky`         | Tests that may be flaky (Trunk pass-on-rerun integration).          |
| `llm`           | Tests that hit external LLM APIs (`@anthropic`, `@openai`, Ollama). |
| `sync`          | Tests that hit external sync APIs (Discord, Linear, browser-based). |
| `sync-e2e`      | End-to-end tests against the real EDGE worker.                      |
| `functions-e2e` | End-to-end tests that deploy and invoke real Cloudflare functions.  |
| `tracing-e2e`   | End-to-end tracing/observability tests against SigNoz.              |

## Migration plan

### 1. Declare tags

`vitest.base.config.ts` (used by every per-package config via `createConfig`)
and `vitest.all.config.ts` (VS Code extension entry) gain:

```ts
test: {
  tags: [
    { name: 'flaky',         description: '...' },
    { name: 'llm',           description: '...' },
    { name: 'sync',          description: '...' },
    { name: 'sync-e2e',      description: '...' },
    { name: 'functions-e2e', description: '...' },
    { name: 'tracing-e2e',   description: '...' },
  ],
}
```

By default Vitest is `strictTags: true`, so every tag we apply must be declared
once.

### 2. Tag tests with the native API

#### `it.effect(...)` / `test(...)` cases

`@effect/vitest`'s `it.effect` accepts Vitest's `TestOptions` as its third
argument (number → `{ timeout }` shorthand). Move the tag from the
`Effect.fn(...)` operator chain to that options object.

```ts
// Before
it.effect(
  'name',
  Effect.fn(
    function* ({ expect }) { ... },
    Effect.provide(TestLayer),
    TestHelpers.provideTestContext,
    TestHelpers.taggedTest('llm'),
  ),
  { timeout: 120_000 },
);

// After
it.effect(
  'name',
  Effect.fn(
    function* ({ expect }) { ... },
    Effect.provide(TestLayer),
    TestHelpers.provideTestContext,
  ),
  { timeout: 120_000, tags: ['llm'] },
);
```

For test files where `it.effect` was called with no third argument, add one
holding only the tags.

#### `describe.runIf(DX_TEST_TAGS=...)` cases

```ts
// Before
describe.runIf(process.env.DX_TEST_TAGS?.includes('functions-e2e'))(
  'CPU limit',
  () => { ... },
);

// After (tags are inherited by every test inside the suite).
describe('CPU limit', { tags: ['functions-e2e'] }, () => { ... });
```

`describe.runIf(...).skip(...)` collapses to `describe.skip('name', { tags: [...] }, ...)`.

#### `test.runIf(TestHelpers.tagEnabled(...))` cases

```ts
// Before
test.runIf(TestHelpers.tagEnabled('llm'))('chat mode ...', async ({ expect }) => { ... });

// After
test('chat mode ...', { tags: ['llm'] }, async ({ expect }) => { ... });
```

### 3. Update the assistant-e2e harness

Drop `AgentTestOptions.testTag` and the `TestHelpers.taggedTest` stage. The
caller passes `tags` directly to `it.effect(...)`'s options object instead.

### 4. Remove the bespoke API

`packages/common/effect/src/testing.ts`:

- Delete `TestTag`, `TestHelpers.tagEnabled`, `TestHelpers.taggedTest`.
- Keep `TestHelpers.runIf`, `skipIf`, `provideTestContext`, and
  `TestContextService` (orthogonal to tagging).

### 5. CI / Moon wiring

- Centralized `:test` task at `.moon/tasks/tag-ts-test.yml` accepts an env-driven
  filter so each context selects which tags it runs:
  `vitest run ... --tagsFilter "$VITEST_TAGS_FILTER"` (with safe default that
  excludes opt-in tags).
- `.github/workflows/check.yml`'s `test` job replaces
  `DX_TEST_TAGS: 'flaky'` with a `VITEST_TAGS_FILTER` value that lets
  `flaky` tests run while excluding the rest (`'!llm && !sync && !sync-e2e && !functions-e2e && !tracing-e2e'`).
- `packages/plugins/plugin-script/moon.yml`'s `e2e` task replaces
  `DX_TEST_TAGS: functions-e2e` with `--tagsFilter=functions-e2e` on the
  `vitest run` command.
- Comments in `tracing-invitation.test.ts`, `session-ollama.test.ts`,
  `sync.test.ts`, and `edge-recovery.test.ts` are rewritten to reference
  `--tagsFilter`.
- `.github/workflows/README.md` flaky/quarantine table is updated to point at
  the new tag/filter mechanism instead of `DX_TEST_TAGS`.

### 6. Verification

- `pnpm -w format-check`.
- `moon run :lint --affected` and `moon run :build --affected` from the
  branch.
- `moon run effect:test`, `moon run ai:test`, `moon run assistant:test`,
  `moon run assistant-toolkit:test`, `moon run assistant-e2e:test`,
  `moon run mcp-client:test`, `moon run plugin-script:test`,
  `moon run plugin-inbox:test`, `moon run client:test`,
  `moon run functions-testing:test`, `moon run plugin-assistant:test` —
  expecting all suites to either pass or skip as before. Tagged tests should
  _not_ execute without the appropriate `--tagsFilter`.

## Out of scope

- The `experimental` storybook tag (`vitest.base.config.ts` →
  `storybookTest({ tags: { include: ['test'], exclude: ['experimental'] } })`)
  is unrelated to the runtime test-tag system and is left alone.
- `safeInstanceof('testTag')` decorator usage in
  `packages/common/util/src/safe-instanceof.test.ts` is unrelated (string is
  the runtime tag for the decorator, not a test classification).
