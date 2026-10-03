//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import { randomUUID } from 'node:crypto';
import os from 'node:os';
import { PostHog } from 'posthog-node';

import type * as Usage from './Usage.ts';

/**
 * PostHog AI observability for a scenario's run: the model calls as `$ai_generation` on one trace,
 * tagged with the experiment so PostHog's offline-evals view can join them to the `$ai_trace` root
 * and the `$ai_evaluation` events the export step sends afterwards, once evalite has named and
 * scored the result. The property names follow PostHog's own eval harness
 * (`products/posthog_ai/eval_harness/trace_events.py`).
 */

const DISTINCT_ID = 'assistant-evals';

/** The Composer project lives in PostHog's EU region. */
const HOST = 'https://eu.i.posthog.com';

/** `ai_product` on every event, so eval traffic is separable from the app's in one project. */
const PRODUCT = 'evals';

const NAMESPACE = 'assistant-evals';

/** A run's identity across every event, in-process and in the export step: PostHog's experiment. */
export type Experiment = {
  readonly id: string;
  readonly name: string;
};

/**
 * From the environment, so the export step names the same experiment the runner tagged the traces
 * with. A local run without one is its own experiment, so nothing merges across developers.
 */
export const experiment = (): Experiment => ({
  id: process.env.DX_EVAL_RUN_ID ?? `local-${os.hostname()}-${Date.now()}`,
  name: `${NAMESPACE}/${process.env.DX_EVAL_RUN_NAME ?? 'local'}`,
});

let client: PostHog | undefined | null;

/** The project's client, or undefined without a key: a local run then sends nothing. */
const posthog = (): PostHog | undefined => {
  if (client === undefined) {
    const apiKey = process.env.DX_EVALS_POSTHOG_API_KEY;
    client = apiKey ? new PostHog(apiKey, { host: HOST }) : null;
  }
  return client ?? undefined;
};

export const enabled = (): boolean => posthog() !== undefined;

/** One scenario run: a trace, its generations, and the flush that lets the process exit. */
export type Run = {
  readonly traceId: string;
  readonly generation: (call: Usage.Call) => void;
  /** Flushes the queue; per run rather than at exit, since vitest's worker does not wait for it. */
  readonly finish: () => Promise<void>;
};

const defined = (record: Record<string, unknown>): Record<string, unknown> =>
  Object.fromEntries(Object.entries(record).filter(([, value]) => value !== undefined));

export const start = (experiment: Experiment): Run => {
  const traceId = randomUUID();
  const tags = {
    ai_product: PRODUCT,
    $ai_experiment_id: experiment.id,
    $ai_experiment_name: experiment.name,
  };

  return {
    traceId,
    generation: (call) => {
      posthog()?.capture({
        distinctId: DISTINCT_ID,
        event: '$ai_generation',
        timestamp: new Date(call.start),
        properties: defined({
          ...tags,
          $ai_trace_id: traceId,
          // The harness has no tracer, so the Effect span's own id is a placeholder.
          $ai_span_id: randomUUID(),
          $ai_parent_id: traceId,
          $ai_span_name: call.spanName,
          $ai_provider: call.provider,
          $ai_model: call.model,
          $ai_model_parameters: call.parameters,
          $ai_input_tokens: call.inputTokens,
          $ai_output_tokens: call.outputTokens,
          $ai_cache_read_input_tokens: call.cacheReadTokens,
          $ai_cache_creation_input_tokens: call.cacheWriteTokens,
          $ai_latency: (call.end - call.start) / 1000,
          $ai_input: call.input,
          $ai_output_choices: call.output,
          $ai_tools: call.tools,
        }),
      });
    },
    finish: async () => {
      await posthog()?.flush();
    },
  };
};
