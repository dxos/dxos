//
// Copyright 2026 DXOS.org
//

import * as FetchHttpClient from '@effect/platform/FetchHttpClient';
import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';
import { Database, Feed, Obj, Ref, Relation } from '@dxos/echo';
import { log } from '@dxos/log';

import { Jmap, GoogleMail, JmapMail } from '../apis';
import { GMAIL_SOURCE, JMAP_MESSAGE_SOURCE } from '../constants';
import { GoogleCredentials, JmapCredentials } from '../services';
import { DraftMessage, InboxOperation, Mailbox } from '../types';
import { findBindingForTarget } from '../util';

const MAIL_ACCOUNT_CAPABILITY = 'urn:ietf:params:jmap:mail';

export default InboxOperation.DeleteEmail.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ mailbox, message }) {
      if (!Mailbox.instanceOf(mailbox) || !Obj.isObject(message)) {
        return { deleted: false };
      }
      const db = Obj.getDatabase(mailbox);
      if (!db) {
        return { deleted: false };
      }

      // Draft (local-only) message: just remove it from the database.
      if (DraftMessage.instanceOf(message)) {
        db.remove(message);
        return { deleted: true };
      }

      // Synced message: move it to the remote trash (best-effort) by its foreign key, then drop the
      // feed copy. The provider is determined by which foreign-key source the message carries.
      const keys = Obj.getMeta(message).keys;
      const gmailId = keys?.find((key) => key.source === GMAIL_SOURCE)?.id;
      const jmapId = keys?.find((key) => key.source === JMAP_MESSAGE_SOURCE)?.id;
      if (gmailId || jmapId) {
        const binding = yield* findBindingForTarget(mailbox).pipe(Effect.provide(Database.layer(db)));
        if (binding) {
          const connectionRef = Ref.make(Relation.getSource(binding));
          if (gmailId) {
            yield* GoogleMail.trashMessage('me', gmailId).pipe(
              Effect.provide(FetchHttpClient.layer),
              Effect.provide(GoogleCredentials.fromConnection(connectionRef)),
              Effect.catchAll((error) => {
                log.catch(error);
                return Effect.void;
              }),
            );
          } else if (jmapId) {
            yield* trashJmapMessage(jmapId).pipe(
              Effect.provide(FetchHttpClient.layer),
              Effect.provide(JmapCredentials.fromConnection(connectionRef)),
              Effect.catchAll((error) => {
                log.catch(error);
                return Effect.void;
              }),
            );
          }
        }
      }

      const feed = mailbox.feed?.target;
      if (feed) {
        yield* Feed.remove(feed, [message]);
      }
      return { deleted: true };
    }),
  ),
  Operation.opaqueHandler,
);

// Moves a JMAP email to the Trash folder by replacing its `mailboxIds` (idempotent).
const trashJmapMessage = (emailId: string) =>
  Effect.gen(function* () {
    const session = yield* Jmap.getSession;
    const accountId = session.primaryAccounts[MAIL_ACCOUNT_CAPABILITY];
    if (!accountId) {
      return;
    }
    const target: JmapMail.Target = { apiUrl: session.apiUrl, accountId };
    const { list: folders } = yield* JmapMail.mailboxGet(target);
    const trash = folders.find((folder) => folder.role === 'trash');
    if (!trash) {
      return;
    }
    yield* JmapMail.emailSetUpdate(target, emailId, { mailboxIds: { [trash.id]: true } });
  });
