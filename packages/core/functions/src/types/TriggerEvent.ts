//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { DXN, Obj, Type } from '@dxos/echo';

export type TriggerEvent = EmailEvent | QueueEvent | SubscriptionEvent | TimerEvent | WebhookEvent;

// TODO(burdon): Reuse trigger schema from @dxos/functions (TriggerType).
export const EmailEvent = Schema.mutable(
  Schema.Struct({
    from: Schema.String,
    to: Schema.String,
    subject: Schema.String,
    created: Schema.String,
    body: Schema.String,
  }),
);
export type EmailEvent = Schema.Schema.Type<typeof EmailEvent>;

export const QueueEvent = Schema.mutable(
  Schema.Struct({
    queue: DXN.Schema,
    item: Schema.Any,
    cursor: Schema.String,
  }),
);
export type QueueEvent = Schema.Schema.Type<typeof QueueEvent>;

export const SubscriptionEvent = Schema.Struct({
  /**
   * Type of the mutation.
   */
  // TODO(dmaretskyi): Specify enum.
  type: Schema.String,

  /**
   * Reference to the object that was changed or created.
   */
  subject: Type.Ref(Obj.Any),

  /**
   * @deprecated
   */
  changedObjectId: Schema.optional(Schema.String),
}).pipe(Schema.mutable);
export type SubscriptionEvent = Schema.Schema.Type<typeof SubscriptionEvent>;

export const TimerEvent = Schema.mutable(Schema.Struct({ tick: Schema.Number }));
export type TimerEvent = Schema.Schema.Type<typeof TimerEvent>;

export const WebhookEvent = Schema.mutable(
  Schema.Struct({
    url: Schema.String,
    method: Schema.Literal('GET', 'POST'),
    headers: Schema.Record({ key: Schema.String, value: Schema.String }),
    bodyText: Schema.String,
  }),
);
export type WebhookEvent = Schema.Schema.Type<typeof WebhookEvent>;
