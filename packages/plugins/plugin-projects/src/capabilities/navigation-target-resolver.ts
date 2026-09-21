//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as Chat from '@dxos/assistant/Chat';
import * as Project from '@dxos/compute/Project';
import { Database, Entity, Obj } from '@dxos/echo';
import { DXN, EID } from '@dxos/keys';
import { Position } from '@dxos/util';

import { getProjectChatPath } from '../paths.ts';

export const NavigationTargetResolver = AppCapability.navigationResolver(
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
