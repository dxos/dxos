//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import type * as Effect from 'effect/Effect';

import { type CleanupFn } from '@dxos/async';
import { type MetricObserver } from '@dxos/tracing';

export * from './extensions';

/**
 * Kind of observability extension.
 *
 * - errors: Error tracking (e.g., PostHog)
 * - events: Product usage event tracking (e.g., PostHog)
 * - feedback: User feedback submission (e.g., PostHog)
 * - generations: AI model calls (e.g., PostHog LLM analytics)
 * - logs: Structured logging (e.g., OTEL)
 * - metrics: Metric data (e.g., OTEL)
 * - traces: Distributed tracing (e.g., OTEL)
 */
export type Kind = 'errors' | 'events' | 'feedback' | 'generations' | 'logs' | 'metrics' | 'traces';

/**
 * Base for every extension API variant. All kinds implement availability the same way.
 */
export type ExtensionApiBase<K extends Kind = Kind> = {
  kind: K;
  isAvailable(): Effect.Effect<boolean>;
};

/**
 * Instrument-level metadata, declared once by the first caller for a given metric name.
 * Units must be UCUM as OTel requires — `s`, `By`, `{thing}`.
 */
export type MetricMeta = { unit?: string; description?: string };

/**
 * Metrics extension API (kind-specific methods only).
 */
export type Metrics = {
  gauge(name: string, value: number, tags?: Attributes, meta?: MetricMeta): void;
  increment(name: string, value?: number, tags?: Attributes, meta?: MetricMeta): void;
  distribution(name: string, value: number, tags?: Attributes, meta?: MetricMeta): void;
  /**
   * Registers a callback read once per export interval.
   * Prefer this over {@link Metrics.gauge} for any "current value" metric, since a pushed gauge
   * only lands in the export windows its producer happens to tick in.
   */
  observe(name: string, callback: MetricObserver, tags?: Attributes, meta?: MetricMeta): CleanupFn;
};

/**
 * Errors extension API (kind-specific methods only).
 */
export type Errors = {
  captureException(error: Error, attributes?: Attributes): void;
};

/**
 * Wider than {@link Attributes}: event properties carry structured values (message arrays,
 * nested objects), not just scalars.
 */
export type EventAttributes = Record<string, unknown>;

/**
 * Events extension API (kind-specific methods only).
 */
export type Events = {
  captureEvent(event: string, attributes?: EventAttributes): void;
};

/**
 * One model call, already filtered by the capture policy and scrubbed (see `AiTelemetry`). Shaped
 * after the OTel GenAI conventions rather than any vendor's schema — an extension maps it onto
 * whatever its backend calls these things.
 */
export type Generation = {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  /** Provider span name, e.g. `LanguageModel.streamText`. */
  spanName: string;
  /** `gen_ai.system` — the serving product, not the wire dialect. */
  provider?: string;
  model?: string;
  /** Conversation the call belongs to, when the call site named one. */
  sessionId?: string;
  /** Request parameters the provider reported (temperature, max_tokens, …). */
  parameters?: Record<string, unknown>;
  /** Excludes tokens served from the prompt cache; add {@link cacheReadTokens} for the total. */
  inputTokens?: number;
  outputTokens?: number;
  /** Absent rather than zero when the provider does not report prompt caching. */
  cacheReadTokens?: number;
  cacheWriteTokens?: number;
  /** Wall-clock duration, in seconds. */
  latency: number;
  streaming: boolean;
  /** Absent entirely when the capture policy denied it. */
  content?: GenerationContent;
  /** Exception class name only — a provider's message can embed request or response fragments. */
  errorClass?: string;
};

export type GenerationContent = {
  /** Parsed prompt messages, or the raw string when {@link truncated} left it unparseable. */
  input?: unknown;
  output?: unknown;
  tools?: unknown;
  /** Some field above was cut to fit, so it is a fragment rather than the whole. */
  truncated?: boolean;
};

/**
 * Generations extension API (kind-specific methods only).
 */
export type Generations = {
  captureGeneration(generation: Generation): void;
};

/**
 * Feedback extension API (kind-specific methods only).
 */
export type Feedback = {
  captureUserFeedback(form: FeedbackForm): Promise<string | undefined>;
};

export type ExtensionApi =
  | (ExtensionApiBase<'errors'> & Errors)
  | (ExtensionApiBase<'events'> & Events)
  | (ExtensionApiBase<'feedback'> & Feedback)
  | (ExtensionApiBase<'generations'> & Generations)
  // TODO(wittjosiah): Direct logs api?
  | ExtensionApiBase<'logs'>
  | (ExtensionApiBase<'metrics'> & Metrics)
  // TODO(wittjosiah): Direct traces api?
  | ExtensionApiBase<'traces'>;

/**
 * Feedback form to be captured by the feedback extension.
 */
// TODO(wittjosiah): Support more form fields (e.g., PostHog custom surveys).
export type FeedbackForm = { message: string; includeLogs?: boolean };

/**
 * Attributes to be attached to observability events.
 */
export type Attributes = Record<string, string | number | boolean | undefined>;

/**
 * Implementation of an observability extension API.
 */
export type Extension = {
  initialize?(): Effect.Effect<void, Error>;
  close?(): Effect.Effect<void>;
  enable?(): Effect.Effect<void>;
  disable?(): Effect.Effect<void>;
  flush?(): Effect.Effect<void>;
  identify?(distinctId: string, attributes?: Attributes, setOnceAttributes?: Attributes): void;
  alias?(distinctId: string, previousId?: string): void;
  setTags?(tags: Record<string, string>): void;
  enabled: boolean;
  apis: ExtensionApi[];
};
