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

| Target       | Endpoint                               | Identity                    | Graded on              |
| ------------ | -------------------------------------- | --------------------------- | ---------------------- |
| `local`      | in-process host (`src/mcp-host.ts`)    | the harness's own           | the database + latency |
| `dev`        | `https://mcp.dev.dxos.network/mcp`     | created by the run, on EDGE | the database + latency |
| `local-edge` | `http://127.0.0.1:8791/mcp`            | `DX_EVAL_MCP_TOKEN` (†)     | discovery + latency    |
| `main`       | `https://mcp.preview.dxos.network/mcp` | `DX_EVAL_MCP_TOKEN`         | discovery + latency    |
| `prod`       | `https://mcp.dxos.network/mcp`         | `DX_EVAL_MCP_TOKEN`         | discovery + latency    |

Against `dev` the run is a real client: the harness creates an identity, binds it to a test account
(`test+…@dxos.org`, the hatch dev and preview keep open), replicates the space it seeds to dev
EDGE, and mints itself an identity-bound API token (`src/McpAuth.ts`, `POST /hub/api/api-tokens`
with a verifiable presentation — the credential a CI job or an agent holds in place of a HALO key).
The deployed worker accepts that token on `/mcp` in place of an OAuth grant and serves the spaces
the identity's agent holds. Every write the `claude` subprocess makes through the deployed worker
comes back by replication, so the run is graded from the database exactly as a local one is. The
other deployed workers serve a space this process cannot see, so a run against them drops the write
stages and scores discovery and latency.

```bash
moon run assistant-evals:evals -- src/evals/mcp-server.eval.ts                        # in-process host
DX_EVAL_MCP_TARGET=dev moon run assistant-evals:evals -- src/evals/mcp-server.eval.ts # deployed dev worker
DX_EVAL_MCP_TARGET=prod DX_EVAL_MCP_TOKEN=... DX_EVAL_SPACE_ID=... \
  moon run assistant-evals:evals -- src/evals/mcp-server.eval.ts                      # an existing session
```

(†) `local-edge` points at `wrangler dev` over plain HTTP, and a bearer is never put on a cleartext
non-loopback wire, so a token run against it needs `DX_EVAL_MCP_URL` naming the worker behind a TLS
terminator (a tunnel) — otherwise it is reachable only for what the endpoint serves unauthenticated.

- `DX_EVAL_MCP_TOKEN` — bearer token for a deployed endpoint whose grant the run cannot mint. Set
  on `dev`, it wins over the run's own identity.
- `DX_EVAL_SPACE_ID` — the space a token run acts on; **required** for one, since the worker serves
  a data plane this process cannot see and there is nothing to fall back to.
- `DX_EVAL_MCP_URL` — override the endpoint of a non-`local` target; `local` is always the
  in-process host. `DX_EVAL_EDGE_URL` likewise overrides the EDGE a `dev` run registers against.
- `DX_EVAL_MCP_LATENCY_BUDGET_MS` — p95 ceiling for the `tool-latency` scorer (500 local, 3000
  remote).

Latency is measured client-side by `src/McpLatency.ts`, over its own MCP connection rather than
inside a turn — a turn's wall clock is the model's, not the surface's. Most of the probe set is
`invokeOperation` against read-only (`mutation('none')`) operations, since that is the tool an agent
spends its turns in and the only one whose latency includes resolving a space and running a handler;
`queryOperations`/`loadSkill` answer out of the registry and measure little more than the transport.

The scorer's value is the full report: connect time plus count/errors/min/mean/p50/p95/max per row,
where a row is a tool — except `invokeOperation`, which is broken out per operation
(`invokeOperation:org.dxos.operation.space.queryObjects`, …), because one figure for it would
average a registry lookup against a full-content query. `*` is the aggregate.

## PostHog

With `DX_EVALS_POSTHOG_API_KEY` set (the Composer project's token; the nightly sets it), every run
is an AI observability trace in PostHog: the runner sends each model call as `$ai_generation`
(`src/Observe.ts`), and `moon run assistant-evals:evals-report` sends the `$ai_trace` root and one
`$ai_evaluation` per scorer from evalite's store once it has scored the run. Events carry
`ai_product: evals` and an experiment id (`DX_EVAL_RUN_ID`, the CI run by default; a local run is
its own experiment), which is what PostHog's offline-evals view groups by. PostHog prices the calls
from the model and the token counts.
