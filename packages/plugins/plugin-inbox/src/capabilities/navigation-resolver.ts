//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { Capability } from '@dxos/app-framework';
import {
  AppCapabilities,
  createTypeSectionPathResolver,
  getSpaceIdFromPath,
  getSpacePath,
  type AppCapabilities as AppCaps,
} from '@dxos/app-toolkit';
import { Database, Key, Type } from '@dxos/echo';
import { EID, URI } from '@dxos/keys';
import { SETTINGS_ID, SETTINGS_KEY } from '@dxos/plugin-settings';
import { getLinkedVariant, isLinkedSegment } from '@dxos/react-ui-attention';

import { meta } from '#meta';
import { Calendar, Mailbox } from '#types';

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

        const rawDxn = query.dxn.startsWith('@dxn:') ? query.dxn.slice(1) : query.dxn;
        const dxnRef = EID.tryParse(rawDxn) ?? (rawDxn.startsWith('dxn:') ? URI.make(rawDxn) : undefined);
        if (!dxnRef) {
          return [];
        }

        const { db } = yield* Database.Service;
        const ref = db.makeRef(dxnRef);
        const object = yield* Database.load(ref).pipe(Effect.catchAll(() => Effect.succeed(null)));
        if (!object || !Mailbox.instanceOf(object)) {
          return [];
        }

        return [
          {
            path: getMailboxAllMailPath(db.spaceId, object.id),
            label: (object as Mailbox.Mailbox).name ?? '',
            type: Type.getTypename(Mailbox.Mailbox),
          },
        ];
      })) as AppCapabilities.NavigationTargetResolver;

    // Parse mailbox paths (root/<spaceId>/mailboxes/<mailboxId>/...) into EIDs (structure only;
    // existence is checked by the caller). A message path (.../~<messageId>) resolves to the message;
    // any other mailbox path resolves to the mailbox itself.
    const pathResolver: AppCaps.NavigationPathResolver = (qualifiedPath) => {
      const segments = qualifiedPath.split('/');
      const spaceId = getSpaceIdFromPath(qualifiedPath);
      const mailboxesIdx = segments.indexOf(getMailboxesSectionId());
      const mailboxId = mailboxesIdx >= 0 ? segments[mailboxesIdx + 1] : undefined;
      if (!spaceId || !mailboxId || !Key.EntityId.isValid(mailboxId)) {
        return Effect.succeed(Option.none());
      }

      const messageId = isLinkedSegment(qualifiedPath) ? getLinkedVariant(qualifiedPath) : undefined;
      const objectId = messageId && Key.EntityId.isValid(messageId) ? messageId : mailboxId;
      return Effect.succeed(Option.some(EID.make({ spaceId, entityId: objectId as Key.EntityId })));
    };

    return [
      Capability.contributes(AppCapabilities.NavigationTargetResolver, resolver),
      Capability.contributes(AppCapabilities.NavigationPathResolver, pathResolver),
      Capability.contributes(
        AppCapabilities.NavigationPathResolver,
        createTypeSectionPathResolver(Type.getTypename(Calendar.Calendar)),
      ),
    ];
  }),
);
