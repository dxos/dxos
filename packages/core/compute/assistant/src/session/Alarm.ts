//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { DXN, Obj, Type } from '@dxos/echo';

/**
 * Feed-level record scheduling a future self-wake of the agent.
 * Managed with regular feed CRUD: append schedules, `Feed.remove` cancels a pending alarm. When it
 * fires, the agent appends the wake-up `Message` carrying `SessionStore.AckAnnotation` naming this
 * record — the ack filters it out of the pending set; the record itself stays in the feed.
 */
export class Alarm extends Type.makeObject<Alarm>(DXN.make('org.dxos.type.alarm', '0.1.0'))(
  Schema.Struct({
    /** Epoch milliseconds at which the agent should wake. */
    wakeAt: Schema.Number,
    /** Reminder surfaced to the agent when the alarm fires. */
    message: Schema.optional(Schema.String),
    /** ISO timestamp when the alarm was scheduled. */
    created: Schema.String,
  }),
) {}

/**
 * Most alarms that may wake the agent in a row without a user prompt between them; each wake is a full turn over the
 * whole context, so an agent polling on alarms would otherwise spend without bound.
 */
export const MAX_SELF_WAKES = 10;

export type MakeProps = {
  wakeAt: number;
  message?: string;
  created?: string;
};

export const make = ({ wakeAt, message, created }: MakeProps): Alarm =>
  Obj.make(Alarm, {
    wakeAt,
    message,
    created: created ?? new Date().toISOString(),
  });
