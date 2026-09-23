//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as Chat from '@dxos/assistant/Chat';
import * as Project from '@dxos/compute/Project';
import { Database, Entity, Obj } from '@dxos/echo';
import { DXN, EID } from '@dxos/keys';
import { Position } from '@dxos/util';

import { getProjectArtifactPath, getProjectChatPath } from '../paths.ts';

/**
 * Places a project's chats on its Chats branch and the artifacts it is parent of on its Artifacts
 * branch. Without this a project chat resolves only to the assistant's Chats section, whose connector
 * queries unparented chats — so the path names a node that does not exist and opening it leaves a
 * blank pane.
 *
 * `Position.first`: the branch is where the tree shows the object as its own, so it outranks both the
 * type section's answer and the generic database subtree.
 */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contribute(AppCapabilities.NavigationTargetResolver, (query) =>
      Effect.gen(function* () {
        if (!query?.uri) {
          return [];
        }
        const targetUri = EID.tryParse(query.uri) ?? DXN.tryMake(query.uri);
        if (!targetUri) {
          return [];
        }

        const { db } = yield* Database.Service;
        const object = yield* Database.load(db.makeRef(targetUri)).pipe(Effect.catch(() => Effect.succeed(null)));
        if (!object || !Obj.isObject(object)) {
          return [];
        }

        const project = Obj.getParent(object);
        if (!project || !Obj.instanceOf(Project.Project, project)) {
          return [];
        }

        const isArtifact = project.artifacts.some((ref) => {
          const eid = EID.tryParse(ref.uri);
          return eid !== undefined && EID.getEntityId(eid) === object.id;
        });
        const path = Obj.instanceOf(Chat.Chat, object)
          ? getProjectChatPath(db.spaceId, project.id, object.id)
          : isArtifact
            ? getProjectArtifactPath(db.spaceId, project.id, object.id)
            : undefined;
        if (!path) {
          return [];
        }

        return [
          {
            path,
            label: Entity.getLabel(object) ?? '',
            type: Obj.getTypename(object)!,
            position: Position.first,
          },
        ];
      }),
    );
  }),
);
