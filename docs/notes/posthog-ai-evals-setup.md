# PostHog AI evaluations — setup hand-off

Run this after [#12883](https://github.com/dxos/dxos/pull/12883) lands and `$ai_generation`
events are flowing from a deployed or dev build. Paste the block below into a fresh Claude
Code session from a dxos worktree.

```markdown
/wizard Walk me through setting up PostHog AI evaluations for Composer's new AI telemetry
pipeline. Generate the wizard only after doing the repo/MCP verification below yourself.

## Context (landed work — verify, don't rebuild)

PR #12883 added PostHog AI observability capture:

- effect-ai emits `gen_ai.*` spans; `AiTelemetry.wrap` middleware in `@dxos/ai`
  (packages/core/compute/ai/src/AiTelemetry.ts) injects a tracer per model call and, for
  content-capture spaces, a content span transformer.
- `AiSpanProcessor` in packages/sdk/observability/src/ai/ai-span-processor.ts maps finished
  spans to `$ai_generation` events via `observability.events.captureEvent` (PostHog consent
  inherited). Scrub rules: attribute allowlist; errors reduced to exception class.
- Policy: observability toggle off = nothing; on = full content (`$ai_input` /
  `$ai_output_choices`, incl. tool results) for EDGE-plaintext spaces (all spaces today);
  metadata only reserved for future E2E spaces. Decision point: `contentCaptureAllowed()` in
  packages/plugins/plugin-observability/src/capabilities/ai-observability.ts.
- `$ai_session_id` = conversation feed URI (annotated in AiSession). Custom segmentation
  properties (skill names, delegated-vs-top-level, turn index, feature) may NOT be stamped
  yet — check for `dxos.ai.*` mappings in the span processor beyond session/input/output/tools,
  and tell me what's missing rather than assuming.

## Before generating the wizard, do this yourself

1. Confirm the branch landed on main (git log) and whether the deployed build has
   `DX_POSTHOG_API_KEY`/`DX_POSTHOG_API_HOST` (.github/workflows/deploy-apps.yml).
2. Via the PostHog MCP (`exec` tool, `llma-*`/`query-llm-traces-list`/`docs-search`
   commands): check whether any `$ai_generation` events have arrived, and list existing
   evaluations so we don't duplicate.
3. Draft the eval definitions below as concrete configs. Create them via
   `llma-evaluation-create` (inactive/draft if supported — I activate in the wizard). Test
   Hog code with `llma-evaluation-test-hog`.

## Evals to set up (invariant-based, since our generations are heterogeneous)

Free Hog checks (run on all events, content not required):

- metadata-health: fail on `$ai_is_error`, empty output, or `finish_reason = length`.
- protocol-adherence: assistant output conforms to the harness `<status>` format contract
  (see packages/core/compute/assistant/src/templates/instructions/format.tpl — derive the
  actual invariant from the template, don't guess).

LLM-as-judge (needs captured content; run on filtered slices to control cost — start with
errored traces + long conversations, not everything):

- claimed-action-without-action: response claims it did/created/sent something but the
  generation contains no tool call.
- hallucinated-capability: response references a tool absent from `$ai_tools`.

Sentiment (free): classify user messages; we want the trend as a frustration/drift signal.

## Wizard steps (human-only parts — this is what the bash wizard walks me through)

1. PostHog project settings: confirm region/retention; add the LLM judge provider key
   (Settings → AI/LLM provider keys). I paste keys, never you.
2. Generate real traffic: open Composer (deployed or `moon run composer-app:serve` with the
   env keys), opt in to telemetry, run an assistant conversation with a tool call.
3. Verify in PostHog UI: AI Observability → Generations/Traces shows the conversation,
   content present, session grouping works.
4. Review + activate each draft eval; spot-check judge reasoning on a few generations.
5. Dashboards: pass-rate trend per eval, broken down by `$ai_model` and `$ai_provider`
   (plus custom props if stamped). Known issue: dashboard UI filters on custom props of
   `$ai_evaluation` can silently return nothing — verify with HogQL when a chart reads zero.
6. Workflow/alert: failed `$ai_evaluation` → notification with reasoning + trace link, to a
   channel I pick.
7. Optional: create a review queue for failed-eval traces.

Out of scope for this session: the canary routine (synthetic scheduled conversation) and
extra segmentation properties — if prerequisites for either are missing, list them at the
end as follow-ups instead of building them.
```

## Why invariant-based evals

Our generation population is heterogeneous: dynamic skill sets, user-authored instructions,
three providers, delegated sub-agents, arbitrary user goals. A global pass rate over that
population is noise. Two things make the metrics consistent:

1. **Evaluate invariants, not task correctness.** Protocol adherence, claimed-action-without-
   action, and hallucinated capability hold regardless of which skills are loaded. The
   hallucinated-capability judge is self-calibrating, since it reads the per-turn `$ai_tools`.
2. **Segment so slices are comparable.** Stamp skills, provider/model, delegation, turn index,
   and feature as custom properties, then read pass rates per slice rather than blended.

A scheduled canary conversation (pinned model, pinned skills, seeded space, fixed prompts,
tagged `canary: true`) gives a longitudinal apples-to-apples series that moves only when the
system moves. Production evals cover real variability; the canary answers "did we regress".

Judges and sentiment need captured content, so they run only where content capture applies —
the Hog metadata checks work everywhere.
