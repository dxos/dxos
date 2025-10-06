//
// Copyright 2025 DXOS.org
//

import { type Effect } from 'effect';

export * from './extensions';

/**
 * Kind of observability extension.
 *
 * - errors: Error tracking (e.g., Sentry, PostHog)
 * - events: Product usage event tracking (e.g., Segment, PostHog)
 * - feedback: User feedback submission (e.g., Sentry, PostHog)
 * - logs: Structured logging (e.g., OTEL)
 * - metrics: Metric data (e.g., OTEL)
 * - traces: Distributed tracing (e.g., OTEL)
 */
export type Kind = 'errors' | 'events' | 'feedback' | 'logs' | 'metrics' | 'traces';

/**
 * Metrics extension API.
 */
export type Metrics = {
  gauge(name: string, value: number, tags?: any): void;
  increment(name: string, value?: number, tags?: any): void;
  distribution(name: string, value: number, tags?: any): void;
};

/**
 * Errors extension API.
 */
export type Errors = {
  captureException(error: Error, attributes?: Attributes): void;
};

/**
 * Events extension API.
 */
export type Events = {
  captureEvent(event: string, attributes?: Attributes): void;
};

/**
 * Feedback extension API.
 */
export type Feedback = {
  captureUserFeedback(form: FeedbackForm): void;
};

export type ExtensionApi =
  | ({ kind: 'errors' } & Errors)
  | ({ kind: 'events' } & Events)
  | ({ kind: 'feedback' } & Feedback)
  // TODO(wittjosiah): Direct logs api?
  | { kind: 'logs' }
  | ({ kind: 'metrics' } & Metrics)
  // TODO(wittjosiah): Direct traces api?
  | { kind: 'traces' };

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
  initialize?(): Effect.Effect<void>;
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
