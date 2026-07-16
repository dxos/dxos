//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Feed, Obj, Ref } from '@dxos/echo';

// TODO(wittjosiah): Review this type.
//   - Should be discriminated union.
//   - Should be more consistent (e.g. subject vs item).
//   - Should re-use schemas if possible.

// TODO(burdon): Reuse trigger schema from @dxos/functions (TriggerType).
export const EmailEvent = Schema.Struct({
  from: Schema.String,
  to: Schema.String,
  subject: Schema.String,
  created: Schema.String,
  body: Schema.String,
});
export type EmailEvent = Schema.Schema.Type<typeof EmailEvent>;

export const FeedEvent = Schema.Struct({
  feed: Ref.Ref(Feed.Feed),
  item: Schema.Any,
  cursor: Schema.String,
  /**
   * True when `item` is a re-append-by-id of an id already delivered to this trigger (a live feed
   * object's `Obj.update`), false on the item's first delivery. See `FeedSpec.ignoreUpdates`.
   */
  isUpdate: Schema.Boolean,
});
export type FeedEvent = Schema.Schema.Type<typeof FeedEvent>;

export const SubscriptionEvent = Schema.Struct({
  /**
   * Type of the mutation.
   */
  // TODO(dmaretskyi): Specify enum.
  type: Schema.String,

  /**
   * Reference to the object that was changed or created.
   */
  subject: Ref.Ref(Obj.Unknown),

  /**
   * @deprecated
   */
  changedObjectId: Schema.optional(Schema.String),
});
export type SubscriptionEvent = Schema.Schema.Type<typeof SubscriptionEvent>;

export const TimerEvent = Schema.Struct({ tick: Schema.Number });
export type TimerEvent = Schema.Schema.Type<typeof TimerEvent>;

export const DirectEvent = Schema.Struct({
  data: Schema.optional(Schema.Record({ key: Schema.String, value: Schema.Any })),
});
export type DirectEvent = Schema.Schema.Type<typeof DirectEvent>;

export const WebhookEvent = Schema.Struct({
  url: Schema.String,
  method: Schema.Literal('GET', 'POST'),
  headers: Schema.Record({ key: Schema.String, value: Schema.String }),
  bodyText: Schema.String,
});
export type WebhookEvent = Schema.Schema.Type<typeof WebhookEvent>;

export const TriggerEvent = Schema.Union(
  EmailEvent,
  FeedEvent,
  DirectEvent,
  SubscriptionEvent,
  TimerEvent,
  WebhookEvent,
);
export type TriggerEvent = Schema.Schema.Type<typeof TriggerEvent>;
