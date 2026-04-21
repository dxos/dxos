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

1. **Check if `ANTHROPIC_API_KEY` is already in env with a non-empty value**. Memoized LLM tests in this repo only need `ANTHROPIC_API_KEY` (including `edge-remote` preset, which proxies to Anthropic). Most harnesses (Cursor Cloud, CI, devcontainers, local shells with `.envrc`) already inject it. Some harnesses set the variable to an empty string, so presence of the name is not enough — check the value length:

   ```bash
   env | grep -E '^ANTHROPIC_API_KEY=' | awk -F= '{print "len=" length($2)}'
   # or: test -n "$ANTHROPIC_API_KEY" && echo set || echo empty
   ```

   **If `ANTHROPIC_API_KEY` is non-empty, DO NOT run `1p-credentials` — it triggers a 1Password auth prompt that interrupts the user unnecessarily.** Skip straight to step 3.

2. **Only if `ANTHROPIC_API_KEY` is missing or empty**, load it from 1Password:

   ```fish
   eval (pnpm -ws 1p-credentials)
   ```

   (In bash/zsh, use the equivalent way to load 1Password credentials for the workspace. If multiple 1Password accounts are configured, prefix with `OP_ACCOUNT=<your-account>`.)

3. **Run tests with generation enabled**:

   ```bash
   ALLOW_LLM_GENERATION=1 moon run '#memoized-llm:test'
   ```

4. **Commit updated conversation files** (e.g. `*.conversations.json`).

## Regenerate one package

To refresh cache for a single package, run that package's tests with generation enabled. Check env first; only run `1p-credentials` if `ANTHROPIC_API_KEY` is missing or empty (to avoid interrupting the user with a 1Password prompt):

```bash
# Check env first; if ANTHROPIC_API_KEY has a non-empty value, skip the 1p step entirely.
env | grep -E '^ANTHROPIC_API_KEY=' | awk -F= '{print "len=" length($2)}'

# Only if missing or empty — otherwise skip this line:
eval (pnpm -ws 1p-credentials)

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
