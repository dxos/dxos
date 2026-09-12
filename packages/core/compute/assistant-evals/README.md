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

## MCP targets and latency

`src/evals/mcp-server.eval.ts` drives the projected MCP surface. `DX_EVAL_MCP_TARGET` picks which
one:

| Target       | Endpoint                          | Graded on                     |
| ------------ | --------------------------------- | ----------------------------- |
| `local`      | in-process host (`src/mcp-host.ts`) | the database + latency        |
| `local-edge` | `http://127.0.0.1:8791/mcp`       | discovery + latency           |
| `dev`        | `https://mcp.dev.dxos.network/mcp` | discovery + latency           |
| `main`       | `https://mcp.preview.dxos.network/mcp` | discovery + latency      |
| `prod`       | `https://mcp.dxos.network/mcp`    | discovery + latency           |

Only `local` is graded from the database: a deployed `mcp-space-service` worker serves its own data
plane, which this process neither seeds nor reads.

```bash
moon run assistant-evals:evals -- src/evals/mcp-server.eval.ts                  # in-process host
DX_EVAL_MCP_TARGET=dev DX_EVAL_MCP_TOKEN=... DX_EVAL_SPACE_ID=... \
  moon run assistant-evals:evals -- src/evals/mcp-server.eval.ts               # deployed dev worker
```

- `DX_EVAL_MCP_TOKEN` — bearer token for a deployed endpoint (it is OAuth-gated, and an eval cannot
  complete a passkey ceremony).
- `DX_EVAL_SPACE_ID` — the space a remote run acts on.
- `DX_EVAL_MCP_URL` — override the endpoint outright.
- `DX_EVAL_MCP_LATENCY_BUDGET_MS` — p95 ceiling for the `tool-latency` scorer (500 local, 3000
  remote).

Latency is measured client-side by `src/McpLatency.ts`, over its own MCP connection rather than
inside a turn — a turn's wall clock is the model's, not the surface's. The scorer's value is the
full report: connect time plus per-tool count/min/mean/p50/p95/max, so a run can be compared across
targets.

## PostHog

With `DX_EVALS_POSTHOG_API_KEY` set (the Composer project's token; the nightly sets it), every run
is an AI observability trace in PostHog: the runner sends each model call as `$ai_generation`
(`src/Observe.ts`), and `moon run assistant-evals:evals-report` sends the `$ai_trace` root and one
`$ai_evaluation` per scorer from evalite's store once it has scored the run. Events carry
`ai_product: evals` and an experiment id (`DX_EVAL_RUN_ID`, the CI run by default; a local run is
its own experiment), which is what PostHog's offline-evals view groups by. PostHog prices the calls
from the model and the token counts.
