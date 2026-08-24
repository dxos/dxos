//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import { Chat } from '@dxos/assistant-toolkit';
import * as Operation from '@dxos/compute/Operation';
import * as Project from '@dxos/compute/Project';
import { Database, Type } from '@dxos/echo';
import * as AssistantOperation from '@dxos/plugin-assistant/AssistantOperation';

import { ProjectOperation } from '#types';

// TODO(wittjosiah): What motivates this being distinct from companion chats?
const handler: Operation.WithHandler<typeof ProjectOperation.CreateChat> = ProjectOperation.CreateChat.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ project }) {
      const { db } = yield* Database.Service;

      // The instructions travel by reference, so the chat follows later edits to the project's.
      const { object: chat } = yield* Operation.invoke(AssistantOperation.CreateChat, {
        db,
        instructions: project.instructions,
      });

      // Ref on the project (annotation) + parent edge; no `SpaceOperation.AddObject`, which would
      // also file the chat in the space root collection and surface it under Collections.
      Chat.linkCompanion({ chat, subject: project });

      // Skills and context objects reach the session through bindings, not the system prompt. What
      // gets bound is the `SubjectContext` contributions' business — the assistant's default provider
      // binds the project and its type's annotated skills, this plugin's adds the instructions'.
      yield* Operation.invoke(AssistantOperation.BindChatContext, { chat, subject: project });

      yield* Database.flush();

      // Open the chat at its own node — a child of the project — not the Chats-section path
      // `getChatPath` builds: plugin-assistant's section query now excludes project-parented chats, so
      // no node exists there and the plank comes up blank.
      const chatPath = GraphPath.getSpacePath(
        db.spaceId,
        GraphPath.GroupSegments.ai,
        Type.getTypename(Project.Project),
        project.id,
        chat.id,
      );
      yield* Operation.invoke(LayoutOperation.Open, { subject: [chatPath] });
      return { chat };
    }),
  ),
);

export default handler;
