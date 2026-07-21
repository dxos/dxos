# End-to-end Tests

The Composer e2e suite runs on [Stagehand](https://www.stagehand.dev/): tests are written
as plain-language `act` steps with schema-driven `extract` assertions, executed by an LLM
against a local CDP-driven chromium. vitest is the runner.

There is intentionally **no selector layer** — no testids, no XPath, no retry helpers.
Steps describe what a user does ("Click the 'Create space' option in the menu"), and
assertions describe what a user sees, extracted into a zod schema and asserted with
vitest's `expect`. The AI layer absorbs markup churn that selector-based suites break on.

## Running

An LLM API key is required (`ANTHROPIC_API_KEY` for the default model):

```bash
DX_PWA=false moon run composer-app:e2e
```

Other harnesses:

```bash
DX_PWA=false moon run composer-app:e2e-dev            # vite dev-server startup benchmark
moon run composer-app:e2e-welcome-focus               # storybook Welcome focus regression
```

Environment variables:

- `STAGEHAND_MODEL` — model for act/extract/observe (default `anthropic/claude-sonnet-4-6`;
  haiku missed hover-revealed and freshly mounted controls often enough to be flaky).
  The matching provider key must be set (e.g. `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`).
- `STAGEHAND_HEADED=1` — watch the browser instead of running headless.
- `DX_E2E_BASE_URL` — override the app URL (defaults to `http://localhost:4173`; the
  vitest global setup starts the matching server automatically).
- `DX_E2E_WORKERS` — number of parallel vitest workers (default 2). Steps are I/O-bound
  model calls, so files run concurrently to win back wall-clock; each worker drives one
  or two chromium instances (multi-peer files drive two). The binding constraint is CPU
  during simultaneous cold boot, not RAM or API rate: several heavy Composer instances
  booting at once saturate the host and `beforeEach`'s `createPeer` boot blows the hook
  timeout. On a 14-core/36GB machine 4 workers mass-times-out on boot; 2 runs clean. Raise
  it only on a bigger host, and watch for `Hook timed out` in beforeEach as the signal you
  went too far.

The default `testTimeout` in `vitest.config.ts` is sized off the median single-peer test
(~2x, the typical case), not the slowest — a global sized for the outlier just masks
regressions everywhere else, and a timeout kill is a total loss under the no-retry policy.
Tests that genuinely need longer carry their own `{ timeout }`: the multi-peer suites
(collaboration, halo) at the suite level, and the "reset device" test inline.

Resolved actions are cached in `node_modules/.cache/stagehand-e2e`: a hit replays the
recorded action without a model call and self-heals if the UI changed. Keys include the
page URL, so only stable-URL steps (e.g. the identity-reset flow) hit across runs —
Composer paths embed per-run space ids. Delete the directory to force full re-inference.

## Structure

- `session.ts` — Stagehand browser session factory (local chromium, model config).
- `composer.ts` — peer factory (boot + invitation/auth-code capture from the console) and
  shared plain-language flows (`createSpace`, `createObject`), plus the few justified
  deterministic escapes:
  - `waitForAppReady` — one boot marker; gating boot on an LLM round-trip would add model
    latency to every test and to the startup benchmarks, which time this exact transition.
  - `selectEditorText` — character-precise CodeMirror selection (comments anchoring) is
    not expressible as a pointer gesture; goes through the `window.composer` test hook.
  - `dragBetween` — drag & drop needs raw CDP input with settle timing; endpoints are
    still resolved from plain-language descriptions via `observe`.
  - `editorContent` — deterministic CodeMirror document text, the probe for
    content-replication waits.
- `startup.spec.ts` / `dev-startup.spec.ts` — timing benchmarks; deterministic by design
  (an LLM in the measurement loop would skew the numbers).

## Assertion & flakiness policy

- **No retries anywhere** — no vitest retries, no assertion-level retry loops, no silent
  extract re-asks. A flaky test fails visibly so the suite's flake rate stays measurable.
- **AI extractions are single-shot.** An extraction is an assertion; re-asking until the
  answer changes would launder nondeterminism into green runs.
- **Inference runs at temperature 0** (pinned via a custom `llmClient`) to remove
  sampling variance from act/extract/observe.
- **Waiting is reserved for genuine asynchrony** (boot, page reloads, cross-peer
  replication) and always uses deterministic probes: the `waitFor*` gates or
  `expect.poll` over DOM/CodeMirror state — never an LLM call in a loop.

## Notes

- Stagehand launches a local Chrome/Chromium via CDP, so the suite is chromium-only.
- Each `act`/`extract` is a model call: tests run slower than the old selector suite and
  CI needs the provider API key configured as a secret.
