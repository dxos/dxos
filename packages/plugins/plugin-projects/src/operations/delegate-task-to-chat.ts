//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database, Obj, Ref } from '@dxos/echo';
import * as AssistantOperation from '@dxos/plugin-assistant/AssistantOperation';

import { ProjectOperation } from '#types';

const handler: Operation.WithHandler<typeof ProjectOperation.DelegateTaskToChat> =
  ProjectOperation.DelegateTaskToChat.pipe(
    Operation.withHandler(
      Effect.fnUntraced(function* ({ task: taskRef }) {
        const task = yield* Database.load(taskRef);

        // `CreateChat` returns the chat unfiled, so it is added to the space explicitly — an unfiled
        // chat never reaches the navtree and the conversation would be unreachable.
        const { object: chat } = yield* Operation.invoke(AssistantOperation.CreateChat, {
          name: task.title,
        });

        // The task moves into the chat's checklist. `Chat.tasks` carries `SetParent`, so this also
        // moves the task's ECHO parent from its task set to the chat.
        Obj.update(chat, (chat) => {
          chat.tasks = [...chat.tasks, Ref.make(task)];
        });

        // Added here rather than through `SpaceOperation.AddObject`: this is a database write, and
        // routing it through plugin-space would make the operation unavailable to any host that does
        // not run that plugin.
        const { db } = yield* Database.Service;
        db.add(chat);

        return { chat };
      }),
    ),
  );

export default handler;
