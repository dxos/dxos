//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Trigger } from '@dxos/compute';
import { DXN, Type } from '@dxos/echo';
import { Mailbox } from '@dxos/plugin-inbox';

/** Cron expression for hourly Gmail sync (minute 0 of every hour). */
export const MAILBOX_SYNC_CRON = '0 * * * *';

/** Links a mailbox to its scheduled Gmail sync trigger so the story can detect idempotent setup. */
export class MailboxTriggerRelation extends Type.makeRelation<MailboxTriggerRelation>(
  DXN.make('org.dxos.storybook.mailboxTriggerRelation', '0.1.0'),
)({
  source: Mailbox.Mailbox,
  target: Trigger.Trigger,
})(Schema.Struct({})) {}
