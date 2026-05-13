//
// Copyright 2025 DXOS.org
//

import { Obj } from '@dxos/echo';
import { DXN } from '@dxos/keys';
import { Message } from '@dxos/types';

/**
 * Inbox drafts are identified by a `properties.mailbox` value that is a valid DXN string.
 * Synced mail does not set this property, so only messages created through draft flows match.
 */

/** Creates a draft message. Callers must include `properties.mailbox` for mailbox-scoped drafts. */
export const make = (props: Obj.MakeProps<typeof Message.Message>) => Obj.make(Message.Message, props);

/** Whether `value` is a Message whose `properties.mailbox` is a valid DXN string (i.e. an inbox draft). */
export const instanceOf = (value: unknown): value is Message.Message =>
  Obj.instanceOf(Message.Message, value) &&
  typeof value.properties?.mailbox === 'string' &&
  DXN.isDXNString(value.properties.mailbox);

/** Whether a draft message is scoped to the given mailbox (by DXN string on properties). */
export const belongsTo = (message: Message.Message, mailboxDxn: string): boolean =>
  instanceOf(message) && message.properties?.mailbox === mailboxDxn;
