//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Annotation, DXN, Feed, Obj, QueryAST, Ref, Type } from '@dxos/echo';

//
// `when` — what to match. Mirrors the `@dxos/compute` Trigger `subscription`/`feed` spec shapes
// (same `QueryAST.Query` / `Ref<Feed>` representation) so the Edge evaluator can reuse trigger
// matching, without `@dxos/types` taking a `@dxos/compute` dependency.
//

/** Match a new item appended to a feed (e.g. a channel message). */
export const FeedWhen = Schema.Struct({
  kind: Schema.Literal('feed'),
  feed: Schema.optional(Ref.Ref(Feed.Feed).annotations({ title: 'Feed' })),
});
export type FeedWhen = Schema.Schema.Type<typeof FeedWhen>;

/** Match a new/changed object in the database matching a query (e.g. a Message in a thread). */
export const SubscriptionWhen = Schema.Struct({
  kind: Schema.Literal('subscription'),
  query: Schema.Struct({
    raw: Schema.optional(Schema.String.annotations({ title: 'Query' })),
    ast: QueryAST.Query,
  }),
});
export type SubscriptionWhen = Schema.Schema.Type<typeof SubscriptionWhen>;

export const When = Schema.Union(FeedWhen, SubscriptionWhen).annotations({ title: 'When' });
export type When = Schema.Schema.Type<typeof When>;

/** A simple predicate used to narrow matches. Extends toward the full query AST over time. */
export const Predicate = Schema.Struct({
  path: Schema.String,
  op: Schema.Literal('eq', 'neq'),
  value: Schema.Any,
});
export type Predicate = Schema.Schema.Type<typeof Predicate>;

export const Match = Schema.Struct({
  typename: Schema.optional(Schema.String),
  where: Schema.optional(Schema.Array(Predicate)),
});
export type Match = Schema.Schema.Type<typeof Match>;

/**
 * Which of the owner's spaces this rule applies to. Self-addressed: the recipient is always the
 * owner (the rule lives in their personal space).
 */
export const Scope = Schema.Struct({
  mode: Schema.optional(Schema.Literal('all', 'only')),
  only: Schema.optional(Schema.Array(Schema.String)), // allow-list of spaceIds (mode='only')
  except: Schema.optional(Schema.Array(Schema.String)), // deny-list of spaceIds (mode='all')
});
export type Scope = Schema.Schema.Type<typeof Scope>;

/** Presentation. Field paths (e.g. `{sender.name}`) are interpolated against the matched object. */
export const Template = Schema.Struct({
  title: Schema.String,
  body: Schema.optional(Schema.String),
  clickAction: Schema.optional(Schema.String),
  data: Schema.optional(Schema.Record({ key: Schema.String, value: Schema.Any })),
});
export type Template = Schema.Schema.Type<typeof Template>;

export const Notify = Schema.Struct({
  /** Grouping label, used for per-user grouping/mute, e.g. `channel.message`. */
  topic: Schema.optional(Schema.String),
  /** Don't notify on events the owner caused. Defaults to true. */
  excludeOwnActions: Schema.optional(Schema.Boolean),
  /** Collapse bursts, e.g. `'30s'`. */
  throttle: Schema.optional(Schema.String),
  /** Optional presentation override; otherwise a per-typename default is used. */
  template: Schema.optional(Template),
});
export type Notify = Schema.Schema.Type<typeof Notify>;

/**
 * A personal notification rule. Stored in the owner's personal space (replicates to Edge). The
 * recipient is always the owner; one event may match many users' rules. Edge compiles these into
 * per-space matchers and publishes to the owner's devices when an event matches and the space is in
 * scope.
 */
export const NotificationRule = Schema.Struct({
  name: Schema.optional(Schema.String),
  enabled: Schema.optional(Schema.Boolean),
  /** Id of the rule preset that created this rule (so a UI toggle can find/remove it). */
  presetId: Schema.optional(Schema.String),
  when: When,
  match: Schema.optional(Match),
  scope: Schema.optional(Scope),
  notify: Schema.optional(Notify),
}).pipe(
  Annotation.IconAnnotation.set({ icon: 'ph--bell--regular', hue: 'amber' }),
  Type.makeObject(DXN.make('org.dxos.type.notification-rule', '0.1.0')),
);

export type NotificationRule = Type.InstanceType<typeof NotificationRule>;

export const instanceOf = (value: unknown): value is NotificationRule => Obj.instanceOf(NotificationRule, value);

/** Create a notification rule object. */
export const make = (props: Obj.MakeProps<typeof NotificationRule>) => Obj.make(NotificationRule, props);

// Per-typename default presentation, used when a rule does not specify its own `notify.template`.
const DEFAULT_TEMPLATES: Record<string, Template> = {
  'org.dxos.type.message': { title: '{sender.name}', body: '{blocks.0.text}' },
};

/** The default presentation template for a matched object typename. */
export const defaultTemplateFor = (typename?: string): Template =>
  (typename && DEFAULT_TEMPLATES[typename]) || { title: 'New activity' };
