# @dxos/assistant-evals

Evalite-based evaluations for the Composer assistant. Separate from `@dxos/assistant-e2e` (memoized vitest agent tests). Evals call the live LLM via `DX_ANTHROPIC_API_KEY` — no conversation cache.

## Run evals

```bash
export DX_ANTHROPIC_API_KEY=...
moon run assistant-evals:evals
```

Eval files live under `src/evals/*.eval.ts`. Shared runner setup is in `src/runner.ts`.
