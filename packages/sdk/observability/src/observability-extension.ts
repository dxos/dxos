//
// Copyright 2025 DXOS.org
//

import type * as Effect from 'effect/Effect';

export * from './extensions';

/**
 * Kind of observability extension.
 *
 * - errors: Error tracking (e.g., PostHog)
 * - events: Product usage event tracking (e.g., PostHog)
 * - feedback: User feedback submission (e.g., PostHog)
 * - logs: Structured logging (e.g., OTEL)
 * - metrics: Metric data (e.g., OTEL)
 * - traces: Distributed tracing (e.g., OTEL)
 */
export type Kind = 'errors' | 'events' | 'feedback' | 'logs' | 'metrics' | 'traces';

/**
 * Base for every extension API variant. All kinds implement availability the same way.
 */
export type ExtensionApiBase<K extends Kind = Kind> = {
  kind: K;
  isAvailable(): Effect.Effect<boolean>;
};

/**
 * Metrics extension API (kind-specific methods only).
 */
export type Metrics = {
  gauge(name: string, value: number, tags?: any): void;
  increment(name: string, value?: number, tags?: any): void;
  distribution(name: string, value: number, tags?: any): void;
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
 * Feedback extension API (kind-specific methods only).
 */
export type Feedback = {
  captureUserFeedback(form: FeedbackForm): void;
};

export type ExtensionApi =
  | (ExtensionApiBase<'errors'> & Errors)
  | (ExtensionApiBase<'events'> & Events)
  | (ExtensionApiBase<'feedback'> & Feedback)
  // TODO(wittjosiah): Direct logs api?
  | ExtensionApiBase<'logs'>
  | (ExtensionApiBase<'metrics'> & Metrics)
  // TODO(wittjosiah): Direct traces api?
  | ExtensionApiBase<'traces'>;

/**
 * Feedback form to be captured by the feedback extension.
 */
// TODO(wittjosiah): Support more form fields (e.g., PostHog custom surveys).
export type FeedbackForm = { message: string };

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
