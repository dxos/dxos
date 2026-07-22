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

## How regeneration works (requires `DX_ANTHROPIC_API_KEY`)

Memoized-llm tests default to the **`direct`** preset (`@dxos/ai/testing` → `TestAiService` / `AssistantTestLayer`), which talks to the Anthropic API directly. Regenerating the cache therefore makes real Anthropic calls and **requires the `DX_ANTHROPIC_API_KEY` env var** to be set.

> Use `DX_ANTHROPIC_API_KEY`, **not** `ANTHROPIC_API_KEY`. Setting `ANTHROPIC_API_KEY` in the shell breaks Claude Code, so the repo reads the key from `DX_ANTHROPIC_API_KEY` everywhere (test layers and the `runIf` gates).

Populate it from 1Password:

```bash
pnpm -ws 1p-credentials   # exports DX_ANTHROPIC_API_KEY (see .config/.env.1password)
```

or export it directly: `export DX_ANTHROPIC_API_KEY=sk-ant-...`.

Normal (non-regenerating) test runs use the committed cache and do **not** need the key.

The `direct`-preset tests that exercise the provider directly (e.g. `effect-ai.test.ts`, `effect-ai-tools.test.ts`) are gated with `TestHelpers.runIf(process.env.DX_ANTHROPIC_API_KEY)` and skip cleanly when the key is absent. They are **not** memoized-llm tests and do not need cache regeneration.

## Regenerate all memoized-llm caches

```bash
ALLOW_LLM_GENERATION=1 moon run '#memoized-llm:test'
```

Then commit updated `*.conversations.json` files.

## Shared ID generation (do not regenerate one-by-one)

Memoized conversations are stored **per test file** (`<test-file>.conversations.json`), and every test in that file shares the same ID stream.

Tests call `EntityId.dangerouslyDisableRandomness()` (or `Obj.ID.dangerouslyDisableRandomness()`) at **module scope**. The PRNG advances as each test in the file runs. Object IDs, tool inputs, and prompts that embed those IDs therefore depend on **which tests ran before** the current one in the same file.

**Do not** regenerate with vitest `-t "<single test name>"`. Running one test in isolation starts the ID sequence at the beginning, so generated memos use different IDs than when the full file runs in order. That corrupts the shared `*.conversations.json` for the other tests in the suite.

**Always regenerate at least the whole test file** (all tests in that file, in default order). Prefer the whole package or `#memoized-llm:test` when multiple files changed.

If the edge worker returns `overloaded_error`, retry the **same file or package** command after a short wait — still without `-t`.

## Regenerate one package

```bash
ALLOW_LLM_GENERATION=1 moon run <package-name>:test
```

Packages that use memoized-llm (tag in `moon.yml`): `ai`, `assistant`, `assistant-toolkit`, `plugin-markdown`, `plugin-assistant`, `functions-runtime`, `assistant-evals`, and others tagged in `moon.yml`.

Example for `assistant-toolkit`:

```bash
ALLOW_LLM_GENERATION=1 moon run assistant-toolkit:test
```

## Regenerate one test file

When only one file’s cache is stale, run **all** tests in that file (no `-t`):

```bash
ALLOW_LLM_GENERATION=1 moon run <package-name>:test -- <path/to/file.test.ts>
```

Example:

```bash
ALLOW_LLM_GENERATION=1 moon run assistant-toolkit:test -- src/skills/project/skill.test.ts
```

## Notes

- Conversation files live next to tests, e.g. `session.conversations.json` next to `session.test.ts`.
- Only run with `ALLOW_LLM_GENERATION=1` when you intend to update the cache; it makes real LLM calls and writes to the repo.
- After regenerating, commit the changed `*.conversations.json` files so CI and others use the new cache.
- The `edge-remote` / `edge-local` presets route through the (deprecated, unauthenticated) edge AI route and are no longer the default. Prefer the `direct` preset with `DX_ANTHROPIC_API_KEY`; in-app clients talk to the AI service through the authenticated EDGE endpoint instead.
