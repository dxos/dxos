//
// Copyright 2026 DXOS.org
//

import type * as ObservabilityExtension from '../../ObservabilityExtension';

/**
 * PostHog's LLM analytics schema. Three events with `$ai_*` properties are what the product reads:
 * `$ai_trace` is the top-level unit (a conversation turn here), `$ai_span` a step inside it (a tool
 * call), `$ai_generation` a model call. They are linked by `$ai_trace_id`, and a span or generation
 * names its parent with `$ai_parent_id`.
 *
 * `$ai_input_tokens` is the uncached count, which is what PostHog expects alongside the two cache
 * figures — together they price the call, and their ratio is the prompt-cache hit rate.
 */
export const AI_GENERATION_EVENT = '$ai_generation';
export const AI_TRACE_EVENT = '$ai_trace';
export const AI_SPAN_EVENT = '$ai_span';

/** `$ai_trace`: the turn, carrying the prompt and the messages it produced as its states. */
export const toAiTraceProperties = (turn: ObservabilityExtension.Turn): Record<string, unknown> =>
  stripUndefined({
    ...spanProperties(turn),
  });

/** `$ai_span` of type `tool`: one tool call, carrying its arguments and result as its states. */
export const toAiSpanProperties = (toolCall: ObservabilityExtension.ToolCall): Record<string, unknown> =>
  stripUndefined({
    ...spanProperties(toolCall),
    $ai_span_type: 'tool',
  });

const spanProperties = (span: ObservabilityExtension.AiSpanBase): Record<string, unknown> => ({
  $ai_trace_id: span.traceId,
  $ai_span_id: span.spanId,
  $ai_parent_id: span.parentSpanId,
  $ai_span_name: span.spanName,
  $ai_session_id: span.sessionId,
  $ai_latency: span.latency,
  $ai_input_state: span.content?.input,
  $ai_output_state: span.content?.output,
  $ai_content_truncated: span.content?.truncated,
  $ai_is_error: span.errorClass ? true : undefined,
  $ai_error: span.errorClass,
});

export const toAiGenerationProperties = (generation: ObservabilityExtension.Generation): Record<string, unknown> =>
  stripUndefined({
    $ai_trace_id: generation.traceId,
    $ai_span_id: generation.spanId,
    $ai_parent_id: generation.parentSpanId,
    $ai_span_name: generation.spanName,
    $ai_provider: generation.provider,
    $ai_model: generation.model,
    $ai_session_id: generation.sessionId,
    $ai_model_parameters: generation.parameters,
    $ai_input_tokens: generation.inputTokens,
    $ai_output_tokens: generation.outputTokens,
    $ai_cache_read_input_tokens: generation.cacheReadTokens,
    $ai_cache_creation_input_tokens: generation.cacheWriteTokens,
    $ai_latency: generation.latency,
    $ai_stream: generation.streaming,
    $ai_input: generation.content?.input,
    $ai_output_choices: generation.content?.output,
    $ai_tools: generation.content?.tools,
    $ai_content_truncated: generation.content?.truncated,
    $ai_is_error: generation.errorClass ? true : undefined,
    $ai_error: generation.errorClass,
  });

const stripUndefined = (properties: Record<string, unknown>): Record<string, unknown> =>
  Object.fromEntries(Object.entries(properties).filter(([, value]) => value !== undefined));
