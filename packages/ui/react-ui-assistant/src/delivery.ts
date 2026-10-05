//
// Copyright 2026 DXOS.org
//

import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';

import { Annotation, Obj } from '@dxos/echo';

/**
 * Where a prompt the reader sent stands on its way to the agent, messenger style.
 *
 * - `sent`: the client holds it (one tick) — shown the moment it is submitted, before anything persists.
 * - `delivered`: the agent's input queue holds it (two ticks); unread until the agent takes it up.
 * - `read`: the agent took it up (two coloured ticks).
 * - `failed`: it never reached the queue; the row offers retry and remove.
 */
export const DeliveryStatus = Schema.Literals(['sent', 'delivered', 'read', 'failed']);
export type DeliveryStatus = Schema.Schema.Type<typeof DeliveryStatus>;

/**
 * Marks a thread row as a prompt still on its way to the agent. Set only on the transient row the
 * host projects for the thread, never on a persisted message: delivery is a fact about this
 * reader's view of the queue, not about the conversation.
 */
export const DeliveryAnnotation: Annotation.Annotation<DeliveryStatus> = Annotation.make({
  id: 'org.dxos.annotation.delivery',
  schema: DeliveryStatus,
});

export const getDelivery = (message: Obj.Unknown | Obj.Snapshot): DeliveryStatus | undefined =>
  Option.getOrUndefined(Annotation.get(message, DeliveryAnnotation));

/** A row the agent has not taken up yet: it cannot be rewound to, and it can still be removed. */
export const isUnread = (status: DeliveryStatus | undefined): boolean =>
  status === 'sent' || status === 'delivered' || status === 'failed';
