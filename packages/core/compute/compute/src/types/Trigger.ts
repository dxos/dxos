//
// Copyright 2023 DXOS.org
//

// @import-as-namespace

import type { Atom } from '@effect-atom/atom';
import * as Context from 'effect/Context';
import type * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Schema from 'effect/Schema';
import * as SchemaAST from 'effect/SchemaAST';

import { Annotation, DXN, Feed, Obj, type Query, QueryAST, Ref, Type } from '@dxos/echo';
import { HiddenAnnotation } from '@dxos/echo/Annotation';
import { OptionsAnnotationId } from '@dxos/echo/Format';

import * as Runnable from '../Runnable';
import type * as TriggerEvent from './TriggerEvent';

/**
 * Type discriminator for TriggerType.
 * Every spec has a type field of type TriggerKind that we can use to understand which type we're working with.
 * https://www.typescriptlang.org/docs/handbook/2/narrowing.html#discriminated-unions
 */
export const Kinds = ['email', 'feed', 'direct', 'subscription', 'timer', 'webhook'] as const;
export type Kind = (typeof Kinds)[number];

const kindLiteralAnnotations = { title: 'Kind' };

export const EmailSpec = Schema.Struct({
  kind: Schema.Literal('email').annotations(kindLiteralAnnotations),
});
export type EmailSpec = Schema.Schema.Type<typeof EmailSpec>;

/**
 * Construct an Email trigger spec.
 */
export const specEmail = (): EmailSpec => ({ kind: 'email' });

// TODO(wittjosiah): Remove. Migrate to Subscription triggers once EDGE supports them for feed queries.
export const FeedSpec = Schema.Struct({
  kind: Schema.Literal('feed').annotations(kindLiteralAnnotations),
  feed: Schema.optional(Ref.Ref(Feed.Feed).annotations({ title: 'Feed' })),
});
export type FeedSpec = Schema.Schema.Type<typeof FeedSpec>;

/**
 * Construct a Feed trigger spec from a Feed object.
 */
export const specFeed = (feed: Feed.Feed): FeedSpec => ({
  kind: 'feed',
  feed: Ref.make(feed),
});

/**
 * Subscription.
 */
export const SubscriptionSpec = Schema.Struct({
  kind: Schema.Literal('subscription').annotations(kindLiteralAnnotations),

  // TODO(burdon): Issue.
  query: Schema.Struct({
    raw: Schema.optional(Schema.String.annotations({ title: 'Query' })),
    ast: QueryAST.Query,
  }),

  options: Schema.optional(
    Schema.Struct({
      // Watch changes to object (not just creation).
      deep: Schema.optional(Schema.Boolean.annotations({ title: 'Nested' })),
      // Debounce changes (delay in ms).
      delay: Schema.optional(Schema.Number.annotations({ title: 'Delay' })),
    }).annotations({ title: 'Options' }),
  ),
});
export type SubscriptionSpec = Schema.Schema.Type<typeof SubscriptionSpec>;

/**
 * Construct a Subscription trigger spec from a Query object.
 */
export const specSubscription = (
  query: Query.Query<any>,
  options?: { deep?: boolean; delay?: number },
): SubscriptionSpec => ({
  kind: 'subscription',
  query: {
    ast: query.ast,
  },
  options: options
    ? {
        deep: options.deep,
        delay: options.delay,
      }
    : undefined,
});

/**
 * Direct invocation only; never scheduled by the dispatcher (invoked on demand by a caller).
 */
export const DirectSpec = Schema.Struct({
  kind: Schema.Literal('direct').annotations(kindLiteralAnnotations),
});
export type DirectSpec = Schema.Schema.Type<typeof DirectSpec>;

/**
 * Construct a Direct trigger spec.
 */
export const specDirect = (): DirectSpec => ({ kind: 'direct' });

/**
 * Cron timer.
 */
export const TimerSpec = Schema.Struct({
  kind: Schema.Literal('timer').annotations(kindLiteralAnnotations),
  cron: Schema.String.annotations({
    title: 'Cron',
    [SchemaAST.ExamplesAnnotationId]: ['0 0 * * *'],
  }),
});
export type TimerSpec = Schema.Schema.Type<typeof TimerSpec>;

/**
 * Construct a Timer trigger spec from a cron string.
 */
export const specTimer = (cron: string): TimerSpec => ({ kind: 'timer', cron });

/**
 * Webhook.
 */
export const WebhookSpec = Schema.Struct({
  kind: Schema.Literal('webhook').annotations(kindLiteralAnnotations),
  method: Schema.optional(
    Schema.String.annotations({
      title: 'Method',
      [OptionsAnnotationId]: ['GET', 'POST'],
    }),
  ),
  port: Schema.optional(
    Schema.Number.annotations({
      title: 'Port',
    }),
  ),
});
export type WebhookSpec = Schema.Schema.Type<typeof WebhookSpec>;

/**
 * Construct a Webhook trigger spec from a method and port.
 */
export const specWebhook = (opts?: { method?: string; port?: number }): WebhookSpec => ({
  kind: 'webhook',
  method: opts?.method,
  port: opts?.port,
});

/**
 * Trigger schema.
 */
export const Spec = Schema.Union(EmailSpec, FeedSpec, DirectSpec, SubscriptionSpec, TimerSpec, WebhookSpec).annotations(
  {
    title: 'Trigger',
  },
);
export type Spec = Schema.Schema.Type<typeof Spec>;

/**
 * Forms the input data passed to the function.
 * Must match the function's input schema.
 *
 * @example
 * {
 *   item: '{{event.item}}',
 *   instructions: 'Summarize and perform entity-extraction'
 *   mailbox: { '/': 'echo://AAA/ZZZ' }
 * }
 */
export const InputTemplate = Schema.Record({ key: Schema.String, value: Schema.Any });

/**
 * Function trigger.
 * Runnable is invoked with the `payload` passed as input data.
 * The event that fires the trigger is available in the runnable context.
 */
export class Trigger extends Type.makeObject<Trigger>(DXN.make('org.dxos.type.trigger', '0.1.0'))(
  Schema.Struct({
    /**
     * Runnable (operation or workflow) to invoke.
     * Wired programmatically (see `Routine.wireTriggers`); not user-editable, so hidden from forms.
     */
    runnable: Ref.Ref(Runnable.Runnable).pipe(
      Schema.annotations({ title: 'Runnable' }),
      Annotation.FormInputAnnotation.set(false),
      Schema.optional,
    ),

    spec: Schema.optional(Spec),

    enabled: Schema.optional(Schema.Boolean),

    /**
     * Runs this trigger on the edge rather than locally.
     * When unset, the trigger runs locally on the client.
     */
    remote: Schema.Boolean.pipe(Schema.annotations({ title: 'Remote' }), Schema.optional),

    concurrency: Schema.Number.pipe(
      Schema.annotations({
        title: 'Concurrency',
        default: 1,
        description: 'Maximum number of concurrent invocations of the trigger.',
      }),
      Annotation.FormInputAnnotation.set(false),
      Schema.optional,
    ),

    /**
     * Only used for workflowSchema.
     * Specifies the input node in the circuit.
     * @deprecated Remove and enforce a single input node in all compute graphSchema.
     */
    inputNodeId: Schema.String.pipe(
      Schema.annotations({ title: 'Input Node ID' }),
      Annotation.FormInputAnnotation.set(false),
      Schema.optional,
    ),

    /**
     * Passed as the input data to the runnable.
     */
    input: InputTemplate.pipe(Annotation.FormInputAnnotation.set(false), Schema.optional),
  }).pipe(Annotation.IconAnnotation.set({ icon: 'ph--lightning--regular', hue: 'yellow' }), HiddenAnnotation.set(true)),
) {}

export const make = (props: Obj.MakeProps<typeof Trigger>) => Obj.make(Trigger, props);

/**
 * Checks if a trigger having this spec can be manually invoked (a `direct` or `timer` trigger).
 */
export const isManuallyInvokable = (spec?: Spec): boolean => spec?.kind === 'direct' || spec?.kind === 'timer';

/**
 * Runtime state of a trigger.
 */
export interface State {
  /**
   * Reference to the trigger object.
   */
  readonly trigger: Ref.Ref<Trigger>;

  /**
   * Where is this trigger running.
   */
  readonly environment: 'edge' | 'local';

  /**
   * Next scheduled cron execution. Set only for `timer` triggers.
   */
  readonly nextExecution?: Date;

  /**
   * Time until which scheduled invocations of this trigger are skipped after a genuine failure.
   * Applies to all trigger kinds. Manual {@link TriggerDispatcher.invokeTrigger} calls bypass it.
   */
  readonly cooldownUntil?: Date;

  /**
   * Pending re-invocation requested via {@link Operation.runAgain} ({@link RunAgainError}).
   * Retries are drained at the tail of the invocation queue, ordered by `enqueuedAt`.
   */
  readonly retry?: {
    /**
     * Event to replay on the retry. Re-running is assumed safe with the same input.
     */
    readonly event: TriggerEvent.TriggerEvent;

    /**
     * Monotonic sequence number used to order pending retries FIFO at the tail of the queue.
     */
    readonly enqueuedAt: number;
  };

  /**
   * Result of the most recent invocation of this trigger.
   */
  readonly lastResult: Exit.Exit<unknown> | null;
}

export interface InvokeOptions {
  trigger: Trigger;
  event: TriggerEvent.TriggerEvent;
}

/**
 * Service for monitoring trigger dispatcher state.
 */
export interface Monitor {
  /**
   * Triggers actively registered in the dispatcher.
   * Could contain entries for both local and edge triggers, but only the edge ones are actually running.
   */
  readonly triggers: Atom.Atom<readonly State[]>;

  readonly localDispatcherEnabled: boolean;

  /**
   * Invoke a trigger.
   * Available only for direct and timer triggers.
   * Invocation respects the trigger's concurrency limit.
   */
  readonly invokeTrigger: (options: InvokeOptions) => Effect.Effect<void>;
}

/**
 * Service for monitoring trigger executions.
 */
export class TriggerMonitorService extends Context.Tag('@dxos/functions/TriggerMonitorService')<
  TriggerMonitorService,
  Monitor
>() {}
