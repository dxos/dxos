//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { useEffect, useRef } from 'react';

import { Operation, Trigger } from '@dxos/compute';
import { DXN, Filter, Obj, Query, Ref, Relation, Type } from '@dxos/echo';
import { InboxOperation, Mailbox } from '@dxos/plugin-inbox';
import { useQuery, useSpaces } from '@dxos/react-client/echo';
import { SyncBinding } from '@dxos/types';

/** Cron expression for hourly Gmail sync (minute 0 of every hour). */
export const MAILBOX_SYNC_CRON = '0 * * * *';

/** Links a mailbox to its scheduled Gmail sync trigger so the story can detect idempotent setup. */
export class MailboxTriggerRelation extends Type.makeRelation<MailboxTriggerRelation>(
  DXN.make('org.dxos.storybook.mailboxTriggerRelation', '0.1.0'),
)({
  source: Mailbox.Mailbox,
  target: Trigger.Trigger,
})(Schema.Struct({})) {}

/**
 * Watches for a Gmail sync binding and creates a manual trigger wired to
 * {@link InboxOperation.GoogleMailSync}. Idempotent — skips when a
 * {@link MailboxTriggerRelation} already links the mailbox to a trigger.
 */
export const SyncTriggerRunner = () => {
  const [space] = useSpaces();
  const [mailbox] = useQuery(space?.db, Filter.type(Mailbox.Mailbox));
  const bindings = useQuery(
    space?.db,
    mailbox ? Query.select(Filter.id(mailbox.id)).targetOf(SyncBinding.SyncBinding) : Query.select(Filter.nothing()),
  );
  const binding = bindings.find(SyncBinding.instanceOf);
  const linkedTriggers = useQuery(
    space?.db,
    mailbox ? Query.select(Filter.id(mailbox.id)).sourceOf(MailboxTriggerRelation) : Query.select(Filter.nothing()),
  );
  const configuredRef = useRef(false);

  useEffect(() => {
    if (!space || !mailbox || !binding || configuredRef.current || linkedTriggers.length > 0) {
      return;
    }

    configuredRef.current = true;
    const trigger = space.db.add(
      Trigger.make({
        [Obj.Parent]: mailbox,
        enabled: true,
        runnable: Ref.make(Operation.serialize(InboxOperation.GoogleMailSync)),
        spec: Trigger.specManual(),
        input: { binding: Ref.make(binding) },
      }),
    );
    space.db.add(
      Relation.make(MailboxTriggerRelation, {
        [Relation.Source]: mailbox,
        [Relation.Target]: trigger,
      }),
    );
    void space.db.flush();
  }, [binding, linkedTriggers.length, mailbox, space]);

  return null;
};
