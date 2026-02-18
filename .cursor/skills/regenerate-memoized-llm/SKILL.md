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

## Regenerate all memoized-llm caches

1. **Load model credentials** (required for LLM calls):

   ```fish
   eval (pnpm -ws 1p-credentials)
   ```

   (In bash/zsh, use the equivalent way to load 1Password credentials for the workspace.)

2. **Run tests with generation enabled**:

   ```bash
   ALLOW_LLM_GENERATION=1 moon run '#memoized-llm:test'
   ```

3. **Commit updated conversation files** (e.g. `*.conversations.json`).

## Regenerate one package

To refresh cache for a single package, run that package’s tests with generation enabled:

```bash
eval (pnpm -ws 1p-credentials)   # or your shell’s equivalent
ALLOW_LLM_GENERATION=1 moon run <package-name>:test
```

Packages that use memoized-llm (tag in `moon.yml`) include: `ai`, `assistant`, `assistant-toolkit`, `plugin-markdown`.

Example for `assistant-toolkit` only:

```bash
ALLOW_LLM_GENERATION=1 moon run assistant-toolkit:test
```

## Notes

- Conversation files live next to tests, e.g. `session.conversations.json` next to `session.test.ts`.
- Only run with `ALLOW_LLM_GENERATION=1` when you intend to update the cache; it uses real LLM calls and writes to the repo.
- After regenerating, commit the changed `*.conversations.json` files so CI and others use the new cache.
