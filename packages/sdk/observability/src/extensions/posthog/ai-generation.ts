//
// Copyright 2026 DXOS.org
//

import type * as ObservabilityExtension from '../../ObservabilityExtension';

/**
 * PostHog's LLM analytics schema. A `$ai_generation` event with `$ai_*` properties is what the
 * product reads to build traces, latency and cost; the names are PostHog's own, which is why this
 * mapping lives with the PostHog extension rather than with the capture policy that produces
 * {@link ObservabilityExtension.Generation}.
 *
 * `$ai_input_tokens` is the uncached count, which is what PostHog expects alongside the two cache
 * figures — together they price the call, and their ratio is the prompt-cache hit rate.
 */
export const AI_GENERATION_EVENT = '$ai_generation';

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
    // Omitted rather than `false`, matching how PostHog's own SDKs report a non-streamed call.
    $ai_stream: generation.streaming ? true : undefined,
    $ai_input: generation.content?.input,
    $ai_output_choices: generation.content?.output,
    $ai_tools: generation.content?.tools,
    $ai_content_truncated: generation.content?.truncated,
    $ai_is_error: generation.errorClass ? true : undefined,
    $ai_error: generation.errorClass,
  });

const stripUndefined = (properties: Record<string, unknown>): Record<string, unknown> =>
  Object.fromEntries(Object.entries(properties).filter(([, value]) => value !== undefined));
