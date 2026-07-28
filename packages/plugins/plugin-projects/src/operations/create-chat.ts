//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { LayoutOperation } from '@dxos/app-toolkit';
import { AiContext } from '@dxos/assistant';
import { Operation, Project } from '@dxos/compute';
import { Database, Obj } from '@dxos/echo';
import { AssistantOperation, getChatPath } from '@dxos/plugin-assistant';

import { ProjectOperation } from '#types';

const handler: Operation.WithHandler<typeof ProjectOperation.CreateChat> = ProjectOperation.CreateChat.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ project }) {
      const { db } = yield* Database.Service;

      // The instructions travel by reference, so the chat follows later edits to the project's.
      const { object: chat } = yield* Operation.invoke(AssistantOperation.CreateChat, {
        db,
        instructions: project.instructions,
      });

      // The parent edge is the ownership statement; no `SpaceOperation.AddObject`, which would also
      // file the chat in the space root collection and surface it under Collections.
      Obj.setParent(chat, project);

      // Skills reach the session through context bindings, not the system prompt.
      const { skills, objects } = Project.contextBindings(project);
      if (skills.length > 0 || objects.length > 0) {
        const registry = yield* Capability.get(Capabilities.AtomRegistry);
        const feed = yield* Database.load(chat.feed);
        const runtime = yield* Effect.runtime<Database.Service>();
        const binder = new AiContext.Binder({ feed, runtime, registry });
        yield* Effect.promise(() => binder.use((binder: AiContext.Binder) => binder.bind({ skills, objects })));
      }

      yield* Database.flush();
      yield* Operation.invoke(LayoutOperation.Open, { subject: [getChatPath(db.spaceId, chat.id)] });
      return { chat };
    }),
  ),
);

export default handler;
