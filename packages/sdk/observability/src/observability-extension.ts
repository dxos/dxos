//
// Copyright 2025 DXOS.org
//

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
 * - logs: Structured logging (e.g., OTEL)
 * - mcp: MCP server sessions and tool calls (e.g., PostHog)
 * - metrics: Metric data (e.g., OTEL)
 * - traces: Distributed tracing (e.g., OTEL)
 */
export type Kind = 'errors' | 'events' | 'feedback' | 'logs' | 'mcp' | 'metrics' | 'traces';

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
 * Events extension API (kind-specific methods only).
 */
export type Events = {
  captureEvent(event: string, attributes?: Attributes): void;
};

/**
 * MCP extension API (kind-specific methods only).
 *
 * Separate from {@link Events} because the MCP events are a vendor-defined schema — the property
 * names, the argument sanitizer and the exception fan-out belong to the backend, not to the caller,
 * which is also why the payloads are richer than {@link Attributes} allows.
 */
export type Mcp = {
  captureInitialize(client: { name?: string; version?: string }): void;
  captureToolCall(call: { toolName: string; parameters?: unknown; durationMs: number; isError: boolean }): void;
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
  // TODO(wittjosiah): Direct logs api?
  | ExtensionApiBase<'logs'>
  | (ExtensionApiBase<'mcp'> & Mcp)
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
