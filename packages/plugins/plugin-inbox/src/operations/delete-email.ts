//
// Copyright 2026 DXOS.org
//

import * as FetchHttpClient from '@effect/platform/FetchHttpClient';
import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';
import { Database, Feed, Obj, Ref, Relation } from '@dxos/echo';
import { log } from '@dxos/log';

import { GoogleMail } from '../apis';
import { GMAIL_SOURCE } from '../constants';
import { GoogleCredentials } from '../services/google-credentials';
import { DraftMessage, InboxOperation, Mailbox } from '../types';
import { findBindingForTarget } from './google/find-binding';

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

      // Synced message: trash it on Gmail (best-effort) by its foreign key, then drop the feed copy.
      const gmailId = Obj.getMeta(message).keys?.find((key) => key.source === GMAIL_SOURCE)?.id;
      if (gmailId) {
        const binding = yield* findBindingForTarget(mailbox).pipe(Effect.provide(Database.layer(db)));
        if (binding) {
          const connectionRef = Ref.make(Relation.getSource(binding));
          yield* GoogleMail.trashMessage('me', gmailId).pipe(
            Effect.provide(FetchHttpClient.layer),
            Effect.provide(GoogleCredentials.fromConnection(connectionRef)),
            Effect.catchAll((error) => {
              log.catch(error);
              return Effect.void;
            }),
          );
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
