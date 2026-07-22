//
// Copyright 2026 DXOS.org
//

import { DXN, EID, Obj } from '@dxos/echo';

import * as Message from './Message';

/**
 * A draft message is identified by a `properties.mailbox` value that is a valid DXN or EID string
 * pointing at the parent container it is scoped to (e.g. a Mailbox). Synced mail does not set this
 * property, so only messages created through draft flows match.
 */

/**
 * Creates a draft message. Callers must include `properties.mailbox` for parent-scoped drafts. A
 * compose draft has no thread yet, so its `threadId` defaults to its own id — the mailbox list groups
 * by `threadId` and would otherwise drop it (see {@link Message.ensureThreadId}).
 */
export const make = (props: Obj.MakeProps<typeof Message.Message>) =>
  Message.ensureThreadId(Obj.make(Message.Message, props));

/** Whether `value` is a Message whose `properties.mailbox` is a valid DXN or EID string (i.e. a draft). */
export const instanceOf = (value: unknown): value is Message.Message =>
  Obj.instanceOf(Message.Message, value) &&
  typeof value.properties?.mailbox === 'string' &&
  (DXN.isDXN(value.properties.mailbox) || EID.isEID(value.properties.mailbox));

/** Whether a draft message is scoped to the given parent container (by DXN string on properties). */
export const belongsTo = (message: Message.Message, parentDXN: string): boolean =>
  instanceOf(message) && message.properties?.mailbox === parentDXN;
