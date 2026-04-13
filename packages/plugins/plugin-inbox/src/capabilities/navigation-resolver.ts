//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities, getSpaceIdFromPath, getSpacePath, type AppCapabilities as AppCaps } from '@dxos/app-toolkit';
import { Database, Filter, Key, Obj, Query } from '@dxos/echo';
import { DXN } from '@dxos/keys';
import { ClientCapabilities } from '@dxos/plugin-client/types';
import { SETTINGS_ID, SETTINGS_KEY } from '@dxos/plugin-settings/types';
import { getLinkedVariant, isLinkedSegment } from '@dxos/react-ui-attention';
import { Message } from '@dxos/types';

import { meta } from '#meta';
import { DraftMessage, Mailbox } from '#types';

import { getMailboxAllMailPath, getMailboxesSectionId } from '../paths';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    // TODO(wittjosiah): Remove cast once NavigationTargetResolver type includes Database.Service.
    const resolver: AppCapabilities.NavigationTargetResolver = ((query) =>
      Effect.gen(function* () {
        if (!query?.dxn) {
          return [
            {
              path: `${getSpacePath(SETTINGS_ID)}/${SETTINGS_KEY}:${meta.id.replaceAll('/', ':')}`,
              label: 'Inbox settings',
              type: 'settings',
            },
          ];
        }

        const dxn = DXN.tryParse(query.dxn.startsWith('@dxn:') ? query.dxn.slice(1) : query.dxn);
        if (!dxn) {
          return [];
        }

        const { db } = yield* Database.Service;
        const ref = db.makeRef(dxn);
        const object = yield* Database.load(ref).pipe(Effect.catchAll(() => Effect.succeed(null)));
        if (!object || !Mailbox.instanceOf(object)) {
          return [];
        }

        return [
          {
            path: getMailboxAllMailPath(db.spaceId, object.id),
            label: (object as Mailbox.Mailbox).name ?? '',
            type: Mailbox.Mailbox.typename,
          },
        ];
      })) as AppCapabilities.NavigationTargetResolver;

    // Resolve mailbox paths (root/<spaceId>/mailboxes/<mailboxId>/...) to DXNs.
    // For message paths (~<messageId>), validates the message exists in the mailbox feed or as a draft in the DB.
    // For mailbox paths, validates the mailbox exists.
    const client = yield* Capability.get(ClientCapabilities.Client);
    const pathResolver: AppCaps.NavigationPathResolver = (qualifiedPath) => {
      const segments = qualifiedPath.split('/');
      const spaceId = getSpaceIdFromPath(qualifiedPath);
      const mailboxesIdx = segments.indexOf(getMailboxesSectionId());
      const mailboxId = mailboxesIdx >= 0 ? segments[mailboxesIdx + 1] : undefined;
      if (!spaceId || !mailboxId || !Key.ObjectId.isValid(mailboxId)) {
        return Effect.succeed(Option.none());
      }

      const space = client.spaces.get(spaceId);
      if (!space) {
        return Effect.succeed(Option.none());
      }

      const mailboxDxn = DXN.fromSpaceAndObjectId(spaceId, mailboxId as Key.ObjectId);
      const mailboxRef = space.db.makeRef(mailboxDxn);

      const isMessagePath = isLinkedSegment(qualifiedPath);
      const messageId = isMessagePath ? getLinkedVariant(qualifiedPath) : undefined;

      return Database.loadOption(mailboxRef).pipe(
        Effect.flatMap((mailboxOption) => {
          if (Option.isNone(mailboxOption) || !Mailbox.instanceOf(mailboxOption.value)) {
            return Effect.succeed(Option.none<DXN>());
          }

          // For non-message paths, the mailbox existing is sufficient.
          if (!messageId || !Key.ObjectId.isValid(messageId)) {
            return Effect.succeed(Option.some(mailboxDxn));
          }

          // For message paths, verify the message exists in the feed or as a mailbox-scoped draft.
          const mailbox = mailboxOption.value as Mailbox.Mailbox;
          const mailboxDxnString = Obj.getDXN(mailbox).toString();

          return Effect.tryPromise(async () => {
            // TODO(wittjosiah): This is awkward, clean it up.
            if (mailbox.feed) {
              const feed = await mailbox.feed.load();
              const messages = await space.db.query(Query.select(Filter.id(messageId)).from(feed)).run();
              if (messages.length > 0) {
                return Option.some(mailboxDxn);
              }
            }

            const fromDb = (await space.db.query(Query.select(Filter.id(messageId))).first()) as
              | Message.Message
              | undefined;
            if (fromDb && DraftMessage.belongsTo(fromDb, mailboxDxnString)) {
              return Option.some(mailboxDxn);
            }

            return Option.none<DXN>();
          }).pipe(Effect.catchAll(() => Effect.succeed(Option.none<DXN>())));
        }),
      );
    };

    return [
      Capability.contributes(AppCapabilities.NavigationTargetResolver, resolver),
      Capability.contributes(AppCapabilities.NavigationPathResolver, pathResolver),
    ];
  }),
);
