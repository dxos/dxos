//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import { Chat } from '@dxos/assistant-toolkit';
import * as Project from '@dxos/compute/Project';
import { Database, Entity, Obj } from '@dxos/echo';
import { DXN, EID } from '@dxos/keys';
import { Position } from '@dxos/util';

import { getProjectChatPath } from '../paths';

/**
 * Places a project's chats on that project's Chats branch. Without this a project chat resolves
 * only to the assistant's Chats section, whose connector queries unparented chats — so the path
 * names a node that does not exist and opening it leaves a blank pane.
 *
 * `Position.first`: the branch is where the tree actually shows the chat, so it outranks both the
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
        const chat = yield* Database.load(db.makeRef(targetUri)).pipe(Effect.catch(() => Effect.succeed(null)));
        if (!chat || !Obj.instanceOf(Chat.Chat, chat)) {
          return [];
        }

        const project = Obj.getParent(chat);
        if (!project || !Obj.instanceOf(Project.Project, project)) {
          return [];
        }

        return [
          {
            path: getProjectChatPath(db.spaceId, project.id, chat.id),
            label: Entity.getLabel(chat) ?? '',
            type: Obj.getTypename(chat)!,
            position: Position.first,
          },
        ];
      }),
    );
  }),
);
