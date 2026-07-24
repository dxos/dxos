# @dxos/assistant-evals

Cross-plugin assistant evaluations: `evalite`-scored evals (`src/evals/*.eval.ts`), graded by real
DB/tool-effect assertions (`src/assertions.ts`) or an LLM judge (`src/judge.ts`) instead of
self-reported completion. Single-plugin/skill scenarios belong in their own plugin package instead,
importing `createEvalRunner` / assertion helpers from here as a library — see
`packages/core/compute/ai/TESTING.md`. Full guide, including the LLM-judge scorer and known
gotchas: `.agents/skills/agent-eval-tests`.

Call the live LLM via `DX_ANTHROPIC_API_KEY` — no conversation cache. Shared runner setup is in
`src/runner.ts`.

```bash
export DX_ANTHROPIC_API_KEY=...
moon run assistant-evals:evals

# Single file (the moon task hardcodes `args: [src/evals]`, so bypass it for one file):
cd packages/core/compute/assistant-evals && npx evalite run src/evals/database.eval.ts
```
