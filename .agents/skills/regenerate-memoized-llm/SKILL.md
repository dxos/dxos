---
name: regenerate-memoized-llm
description: Regenerate cached LLM responses for tests that use memoized conversations. Use when tests fail with "No memoized conversation found for the given prompt", when fixing or adding memoized-llm tests, or when the user asks to regenerate or update LLM conversation cache.
---

# Regenerate Memoized LLM Test Cache

Tests in this repo use **memoized LLM responses** stored in `*.conversations.json` files committed to git. When prompts or behavior change, the cache can be stale and tests fail with:

```text
No memoized conversation found for the given prompt.
Re-run test with ALLOW_LLM_GENERATION=1 to generate a new memoized conversation.
```

## How regeneration works (no API key required)

Memoized-llm tests default to the **`edge-remote`** preset (`@dxos/ai/testing` → `TestAiService` / `AssistantTestLayer`), which routes LLM requests through the DXOS edge worker (`https://ai-service.dxos.workers.dev/provider/anthropic`).

**You do NOT need `ANTHROPIC_API_KEY` to regenerate the cache.** Do not check for the key, do not run `pnpm -ws 1p-credentials`, do not block on a missing key. The edge worker proxies the request and handles auth on the server side.

The only tests that legitimately require `ANTHROPIC_API_KEY` are the ones explicitly testing the `direct` preset (e.g. `effect-ai.test.ts`, `effect-ai-tools.test.ts`); those are gated with `TestHelpers.runIf(process.env.ANTHROPIC_API_KEY)` and skip cleanly when the key is absent. They are **not** memoized-llm tests and do not need cache regeneration.

## Regenerate all memoized-llm caches

```bash
ALLOW_LLM_GENERATION=1 moon run '#memoized-llm:test'
```

Then commit updated `*.conversations.json` files.

## Regenerate one package

```bash
ALLOW_LLM_GENERATION=1 moon run <package-name>:test
```

Packages that use memoized-llm (tag in `moon.yml`): `ai`, `assistant`, `assistant-toolkit`, `plugin-markdown`.

Example for `assistant-toolkit`:

```bash
ALLOW_LLM_GENERATION=1 moon run assistant-toolkit:test
```

## Regenerate one test

To regenerate the cache for a single failing test (faster than the whole package):

```bash
ALLOW_LLM_GENERATION=1 moon run <package-name>:test -- <test-file> -t "<test name>"
```

Example:

```bash
ALLOW_LLM_GENERATION=1 moon run assistant-toolkit:test -- src/blueprints/project/blueprint.test.ts -t "planning"
```

## Notes

- Conversation files live next to tests, e.g. `session.conversations.json` next to `session.test.ts`.
- Only run with `ALLOW_LLM_GENERATION=1` when you intend to update the cache; it makes real LLM calls and writes to the repo.
- After regenerating, commit the changed `*.conversations.json` files so CI and others use the new cache.
- If a test you're regenerating uses `aiServicePreset: 'direct'` (or `TestAiService({ preset: 'direct' })`), switch it to `'edge-remote'` so future regenerations don't require an API key. The only acceptable use of `'direct'` is in tests explicitly gated on `runIf(process.env.ANTHROPIC_API_KEY)` that exist to exercise the direct provider.
