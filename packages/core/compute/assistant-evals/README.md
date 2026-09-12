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
export DX_ANTHROPIC_API_KEY=...          # or: eval "$(pnpm -ws 1p-credentials)"

moon run assistant-evals:evals                                   # every scenario
moon run assistant-evals:evals -- src/evals/database.eval.ts     # one scenario
moon run assistant-evals:evals-watch                             # re-run on change, with the UI
```

The tasks come from the `evalite` moon tag (`.moon/tasks/tag-evalite.yml`); the nightly
`.depot/workflows/assistant-evals.yml` runs the same `evals` task.

## PostHog

With `DX_EVALS_POSTHOG_API_KEY` set (the Composer project's token; the nightly sets it), every run
is an AI observability trace in PostHog: the runner sends each model call as `$ai_generation`
(`src/Observe.ts`), and `moon run assistant-evals:evals-report` sends the `$ai_trace` root and one
`$ai_evaluation` per scorer from evalite's store once it has scored the run. Events carry
`ai_product: evals` and an experiment id (`DX_EVAL_RUN_ID`, the CI run by default; a local run is
its own experiment), which is what PostHog's offline-evals view groups by. PostHog prices the calls
from the model and the token counts.
