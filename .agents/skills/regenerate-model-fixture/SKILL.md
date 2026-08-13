---
name: regenerate-model-fixture
description: Regenerate cached LLM responses for tests that replay model fixtures. Use when tests fail with "No memoized conversation found for the given prompt", when fixing or adding model-fixture tests, or when the user asks to regenerate or update the LLM conversation cache.
---

# Regenerate Model-Fixture Test Cache

Tests in this repo replay **recorded LLM turns** ("model fixtures") stored under
`.store/conversations/<suite>/<hash>.json` committed to git. Suites carry the
`model-fixture` vitest tag and are **skipped by default** (no key needed). When
prompts or behavior change, a stale fixture fails the test with:

```text
No memoized conversation found for the given prompt.
Re-run test with DX_UPDATE_MODEL_FIXTURES=1 to generate a new memoized conversation.
```

## Gating (one place: `vitest.tags.ts`)

The `model-fixture` tag is skipped unless opted in:

- `DX_RUN_MODEL_FIXTURE_TESTS=1` — **replay** the committed fixtures (error on a miss).
- `DX_UPDATE_MODEL_FIXTURES=1` — **regenerate**: also un-skips the suites and hits the live model on a miss.

A plain `moon run <pkg>:test` sets neither, so these suites never need an API key locally or in the default CI.

## How regeneration works (requires `DX_ANTHROPIC_API_KEY`)

Model-fixture tests default to the **`direct`** preset (`@dxos/ai/testing` →
`TestAiService` / `AssistantTestLayer`), which talks to the Anthropic API
directly. Regenerating makes real Anthropic calls and **requires the
`DX_ANTHROPIC_API_KEY` env var**.

> Use `DX_ANTHROPIC_API_KEY`, **not** `ANTHROPIC_API_KEY`. Setting
> `ANTHROPIC_API_KEY` in the shell breaks Claude Code, so the repo reads the key
> from `DX_ANTHROPIC_API_KEY` everywhere (test layers and the `runIf` gates).

Populate it from 1Password:

```bash
pnpm -ws 1p-credentials   # exports DX_ANTHROPIC_API_KEY from the 1Password CI vault
```

or export it directly: `export DX_ANTHROPIC_API_KEY=sk-ant-...`.

The `direct`-preset tests that exercise the provider directly (e.g.
`effect-ai.test.ts`, `effect-ai-tools.test.ts`) are gated with
`TestHelpers.runIf(process.env.DX_ANTHROPIC_API_KEY)` and skip cleanly when the
key is absent. They are **not** model-fixture tests and do not need regeneration.

## Regenerate all model-fixture caches

```bash
DX_UPDATE_MODEL_FIXTURES=1 moon run '#model-fixture:test'
```

Then commit the updated `.store/conversations/**` files.

## Shared ID generation (do not regenerate one-by-one)

Tests call `EntityId.dangerouslyDisableRandomness()` (or
`Obj.ID.dangerouslyDisableRandomness()`) at **module scope**. The PRNG advances
as each test in the file runs, so object IDs, tool inputs, and prompts that embed
those IDs depend on **which tests ran before** the current one in the same file.

**Do not** regenerate with vitest `-t "<single test name>"`. Running one test in
isolation starts the ID sequence at the beginning, so generated fixtures use
different IDs than when the full file runs in order — corrupting the shared
fixtures for the other tests in the suite.

**Always regenerate at least the whole test file** (all tests, default order).
Prefer the whole package or `#model-fixture:test` when multiple files changed.

If the edge worker returns `overloaded_error`, retry the **same file or package**
command after a short wait — still without `-t`.

## Regenerate one package

```bash
DX_UPDATE_MODEL_FIXTURES=1 moon run <package-name>:test
```

Packages that use model-fixture (tag in `moon.yml`): `ai`, `agent-runtime`,
`assistant`, `assistant-toolkit`, `plugin-markdown`, `plugin-magazine`,
`plugin-commerce`, `plugin-assistant`, `assistant-e2e`.

## Regenerate one test file

When only one file's cache is stale, run **all** tests in that file (no `-t`):

```bash
DX_UPDATE_MODEL_FIXTURES=1 moon run <package-name>:test -- <path/to/file.test.ts>
```

## Notes

- Fixtures live under `.store/conversations/<suite>/<hash>.json` at the repo root; `<suite>`
  is derived mechanically from the test-file path and `<hash>` is the request hash.
- Only run with `DX_UPDATE_MODEL_FIXTURES=1` when you intend to update the cache; it makes real
  LLM calls and writes to the repo.
- After regenerating, commit the changed `.store/conversations/**` files so CI and others replay the new cache.
- The `edge-remote` / `edge-local` presets route through the (deprecated, unauthenticated) edge AI
  route and are no longer the default. Prefer the `direct` preset with `DX_ANTHROPIC_API_KEY`.
