//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities, Paths, TypeSection, type AppCapabilities as AppCaps } from '@dxos/app-toolkit';
import { Database, Key, Type } from '@dxos/echo';
import { EID, URI } from '@dxos/keys';
import { getPluginSettingsSectionPath } from '@dxos/plugin-settings';
import { getLinkedVariant, isLinkedSegment } from '@dxos/react-ui-attention';

import { meta } from '#meta';
import { Calendar, Mailbox } from '#types';

import { getMailboxPath, getMailboxesSectionId } from '../paths';

/**
 * Creates a path resolver for feed-object navigation paths of the form
 * `root/<spaceId>/…/<parentSegment>/<parentId>/~<childId>`.
 * Resolves to the child's EID; returns `Option.none` for any other path shape.
 */
const createFeedObjectPathResolver =
  (parentSegmentName: string): AppCaps.NavigationPathResolver =>
  (qualifiedPath) => {
    if (!isLinkedSegment(qualifiedPath)) {
      return Effect.succeed(Option.none());
    }
    const segments = qualifiedPath.split('/');
    const spaceId = Paths.getSpaceIdFromPath(qualifiedPath);
    const parentIdx = segments.indexOf(parentSegmentName);
    const parentId = parentIdx >= 0 ? segments[parentIdx + 1] : undefined;
    if (!spaceId || !parentId || !Key.EntityId.isValid(parentId)) {
      return Effect.succeed(Option.none());
    }
    const childId = getLinkedVariant(qualifiedPath);
    if (!Key.EntityId.isValid(childId)) {
      return Effect.succeed(Option.none());
    }
    return Effect.succeed(Option.some(EID.make({ spaceId, entityId: childId as Key.EntityId })));
  };

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    // TODO(wittjosiah): Remove cast once NavigationTargetResolver type includes Database.Service.
    const resolver: AppCapabilities.NavigationTargetResolver = ((query) =>
      Effect.gen(function* () {
        if (!query?.dxn) {
          return [
            {
              path: getPluginSettingsSectionPath(meta.profile.key),
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
            path: getMailboxPath(db.spaceId, object.id),
            label: (object as Mailbox.Mailbox).name ?? '',
            type: Type.getTypename(Mailbox.Mailbox),
          },
        ];
      })) as AppCapabilities.NavigationTargetResolver;

    // Resolves plain mailbox paths (root/<spaceId>/mailboxes/<mailboxId>/...) to the mailbox EID.
    // Linked-segment message paths are handled separately by createFeedObjectPathResolver below.
    const mailboxPathResolver: AppCaps.NavigationPathResolver = (qualifiedPath) => {
      if (isLinkedSegment(qualifiedPath)) {
        return Effect.succeed(Option.none());
      }
      const segments = qualifiedPath.split('/');
      const spaceId = Paths.getSpaceIdFromPath(qualifiedPath);
      const mailboxesIdx = segments.indexOf(getMailboxesSectionId());
      const mailboxId = mailboxesIdx >= 0 ? segments[mailboxesIdx + 1] : undefined;
      if (!spaceId || !mailboxId || !Key.EntityId.isValid(mailboxId)) {
        return Effect.succeed(Option.none());
      }
      return Effect.succeed(Option.some(EID.make({ spaceId, entityId: mailboxId as Key.EntityId })));
    };

    return [
      Capability.contributes(AppCapabilities.NavigationTargetResolver, resolver),
      Capability.contributes(AppCapabilities.NavigationPathResolver, mailboxPathResolver),
      Capability.contributes(
        AppCapabilities.NavigationPathResolver,
        createFeedObjectPathResolver(getMailboxesSectionId()),
      ),
      Capability.contributes(
        AppCapabilities.NavigationPathResolver,
        createFeedObjectPathResolver(Type.getTypename(Calendar.Calendar)),
      ),
      Capability.contributes(
        AppCapabilities.NavigationPathResolver,
        TypeSection.createTypeSectionPathResolver(Calendar.Calendar, { groupId: Paths.GroupSegments.communications }),
      ),
    ];
  }),
);
