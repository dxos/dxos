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

1. **Check if credentials are already in env first**. Some harnesses (e.g. Cursor Cloud, CI, devcontainers) inject API keys via their own env config, so you may not need to pull from 1Password at all. Check for provider keys before running the 1Password script:

   ```bash
   env | grep -E '^(ANTHROPIC_API_KEY|OPENAI_API_KEY|GOOGLE_API_KEY|EDGE_AI_SERVICE_ENDPOINT)='
   ```

   If the required key(s) for the provider used by the test are already set, skip step 2.

2. **Load model credentials from 1Password** (only if not already in env):

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

To refresh cache for a single package, run that package’s tests with generation enabled. First check if provider API keys are already in env — only run `1p-credentials` if they aren't:

```bash
# Check env first; if keys are already set, skip the 1p step.
env | grep -E '^(ANTHROPIC_API_KEY|OPENAI_API_KEY|GOOGLE_API_KEY|EDGE_AI_SERVICE_ENDPOINT)='

eval (pnpm -ws 1p-credentials)   # only if keys aren't already in env
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
