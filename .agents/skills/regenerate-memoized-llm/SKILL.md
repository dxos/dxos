---
name: regenerate-memoized-llm
description: Regenerate cached LLM responses for tests that use memoized conversations. Use when tests fail with "No memoized conversation found for the given prompt", when fixing or adding memoized-llm tests, or when the user asks to regenerate or update LLM conversation cache.
---

# Regenerate Memoized LLM Test Cache

Tests in this repo can use **memoized LLM responses** stored in `*.conversations.json` files committed to git. When prompts or behavior change, the cache can be stale and tests fail with:

```
No memoized conversation found for the given prompt.
Re-run test with ALLOW_LLM_GENERATION=1 to generate a new memoized conversation.
```

## Credentials

The default inference preset is `edge-remote`, which proxies to Anthropic through `https://ai-service.dxos.workers.dev` and **requires no API key or credentials**. Just run the tests with `ALLOW_LLM_GENERATION=1`.

**Never run `1p-credentials` or any 1Password command.** It triggers an interactive auth prompt. If a test explicitly needs a different provider and fails without credentials, stop and ask the user — do not try to load from 1Password.

## Regenerate all memoized-llm caches

```bash
ALLOW_LLM_GENERATION=1 moon run '#memoized-llm:test'
```

Then commit the updated `*.conversations.json` files.

## Regenerate one package

```bash
ALLOW_LLM_GENERATION=1 moon run <package-name>:test
```

Packages that use memoized-llm (tag in `moon.yml`) include: `ai`, `assistant`, `assistant-toolkit`, `assistant-e2e`, `plugin-markdown`.

Example for `assistant-toolkit` only:

```bash
ALLOW_LLM_GENERATION=1 moon run assistant-toolkit:test
```

## Notes

- Conversation files live next to tests, e.g. `session.conversations.json` next to `session.test.ts`.
- Only run with `ALLOW_LLM_GENERATION=1` when you intend to update the cache; it uses real LLM calls and writes to the repo.
- After regenerating, commit the changed `*.conversations.json` files so CI and others use the new cache.
- The test suite in a file shares a PRNG seed (via `Obj.ID.dangerouslyDisableRandomness()`), so regenerate the entire file — not just the failing test — to keep cached conversations coherent.
