//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Chat } from '@dxos/assistant-toolkit';
import * as Operation from '@dxos/compute/Operation';
import * as Project from '@dxos/compute/Project';
import { Database, Feed, Obj, Ref } from '@dxos/echo';
import * as AssistantOperation from '@dxos/plugin-assistant/AssistantOperation';
import { Message } from '@dxos/types';
import { trim } from '@dxos/util';

import { ProjectOperation } from '#types';

const handler: Operation.WithHandler<typeof ProjectOperation.DelegateTaskToChat> =
  ProjectOperation.DelegateTaskToChat.pipe(
    Operation.withHandler(
      Effect.fnUntraced(function* ({ task: taskRef }) {
        const task = yield* Database.load(taskRef);
        const { db } = yield* Database.Service;

        // The chat is filed under the task's project, so it lands in that project's navtree rather
        // than loose in the space. Walked from the task rather than taken as input: the row the
        // action runs from knows the task and nothing else.
        const project = findProject(task);

        const { object: chat } = yield* Operation.invoke(AssistantOperation.CreateChat, {
          name: task.title,
        });

        // The task moves into the chat's checklist. `Chat.tasks` carries `SetParent`, so this also
        // moves the task's ECHO parent from its task set to the chat.
        Obj.update(chat, (chat) => {
          chat.tasks = [...chat.tasks, Ref.make(task)];
        });

        // Parent edge before the add, as the project's own create-chat action does: it files the
        // chat under the project rather than the space root.
        if (project) {
          Chat.linkCompanion({ chat, subject: project });
        }

        // Added here rather than through `SpaceOperation.AddObject`: this is a database write, and
        // routing it through plugin-space would make the operation unavailable to any host that does
        // not run that plugin.
        db.add(chat);

        // An opening prompt, so the conversation starts on the work rather than on a blank page. A
        // user message rather than instructions: it is what the reader would otherwise have typed.
        const feed = yield* Database.load(chat.feed);
        yield* Feed.append(feed, [
          Message.make({
            sender: { role: 'user' },
            blocks: [{ _tag: 'text', text: openingPrompt(task.title, task.description) }],
          }),
        ]);

        return { chat };
      }),
    ),
  );

/** The task's project, walked up the ECHO parents (task → task set → project). */
const findProject = (task: Obj.Any): Project.Project | undefined => {
  let cursor: Obj.Any | undefined = Obj.getParent(task);
  // Bounded: a malformed parent chain must not spin, and nothing legitimate is this deep.
  for (let depth = 0; cursor && depth < 8; depth++) {
    if (Obj.instanceOf(Project.Project, cursor)) {
      return cursor;
    }
    cursor = Obj.getParent(cursor);
  }
  return undefined;
};

const openingPrompt = (title: string, description?: string) => trim`
  Execute this task: "${title}".${description ? `\n\n${description}` : ''}

  Report what you did when it is done.
`;

export default handler;
