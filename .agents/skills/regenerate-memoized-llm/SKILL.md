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

2. **If the shell env is empty, fall back to Claude Code's `~/.claude/settings.json`** before reaching for 1Password — Claude Code often stores the key there and only injects it into its own runtime, not into the shell spawned by Bash tool calls. Extract and export it inline:

   ```bash
   export ANTHROPIC_API_KEY=$(jq -r '.env.ANTHROPIC_API_KEY // empty' ~/.claude/settings.json)
   test -n "$ANTHROPIC_API_KEY" && echo "loaded from ~/.claude/settings.json, len=${#ANTHROPIC_API_KEY}"
   ```

   If that also comes up empty, then load from 1Password:

   ```fish
   eval (pnpm -ws 1p-credentials)
   ```

   (In bash/zsh, use the equivalent way to load 1Password credentials for the workspace. If multiple 1Password accounts are configured, prefix with `OP_ACCOUNT=<your-account>`.)

3. **Run tests with generation enabled**. Inline the `export` in the same command chain so the key survives into the `moon` invocation (Bash tool calls don't persist exports across turns):

   ```bash
   export ANTHROPIC_API_KEY=$(jq -r '.env.ANTHROPIC_API_KEY // empty' ~/.claude/settings.json) && \
     ALLOW_LLM_GENERATION=1 moon run '#memoized-llm:test'
   ```

4. **Commit updated conversation files** (e.g. `*.conversations.json`).

## Regenerate one package

To refresh cache for a single package, run that package's tests with generation enabled. Follow the same credential order as above — shell env → `~/.claude/settings.json` → 1Password — and only reach for `1p-credentials` as a last resort:

```bash
# Check env first; if ANTHROPIC_API_KEY has a non-empty value, skip the fallbacks.
env | grep -E '^ANTHROPIC_API_KEY=' | awk -F= '{print "len=" length($2)}'

# Fallback 1: Claude Code settings (silent — safe to try first).
export ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY:-$(jq -r '.env.ANTHROPIC_API_KEY // empty' ~/.claude/settings.json)}

# Fallback 2 (only if still empty): 1Password — may prompt for auth.
[ -z "$ANTHROPIC_API_KEY" ] && eval "$(pnpm -ws 1p-credentials)"

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
