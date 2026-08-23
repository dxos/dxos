//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database, Filter, Obj, Query, Scope } from '@dxos/echo';
import { buildContactFromActor } from '@dxos/extractor-lib';
import * as SpaceOperation from '@dxos/plugin-space/SpaceOperation';
import { Message } from '@dxos/types';

import { InboxOperation, SystemTags } from '#types';

/** @deprecated Use ExtractContactFromMessage through the ExtractMessage dispatcher instead. */
const handler: Operation.WithHandler<typeof InboxOperation.ExtractContact> = InboxOperation.ExtractContact.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ db, actor, mailbox: mailboxRef }) {
      const contact = yield* buildContactFromActor(actor, db);
      if (!contact) {
        return;
      }
      yield* Operation.invoke(SpaceOperation.AddObject, { object: contact }, { spaceId: db.spaceId });

      // Knowing who someone is makes their mail worth surfacing, so everything already received from
      // them is labelled — not just messages that arrive after the contact exists.
      if (!mailboxRef || !actor.email) {
        return;
      }
      const mailbox = yield* Database.load(mailboxRef);
      const feed = yield* Database.load(mailbox.feed);
      const messages = yield* Database.query(
        Query.select(Filter.type(Message.Message)).from([
          Scope.space(),
          Scope.feed(Obj.getURI(feed, { prefer: 'absolute' })),
        ]),
      ).run;
      const address = actor.email.toLowerCase();
      const fromSender = messages.filter((message) => message.sender?.email?.toLowerCase() === address);
      yield* SystemTags.applyTagToAll(mailbox, fromSender, 'important');
    }),
  ),
);

export default handler;
