//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import { TrajectoryStore } from '@dxos/assistant';
import * as Chat from '@dxos/assistant/Chat';
import * as Operation from '@dxos/compute/Operation';
import { Database, Obj, Ref } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import * as SpaceOperation from '@dxos/plugin-space/SpaceOperation';
import { Reducer, Trajectory } from '@dxos/trajectory';

import { AssistantOperation } from '#types';

const handler: Operation.WithHandler<typeof AssistantOperation.ForkChat> = AssistantOperation.ForkChat.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ chat, companionTo }) {
      const { db } = yield* Database.Service;
      const sourceFeed = yield* Database.load(chat.feed);

      const client = yield* Capability.get(ClientCapabilities.Client);
      const space = client.spaces.get(db.spaceId);
      invariant(space, 'Space not found.');

      const dbLayer = Database.layer(space.db);

      // The fork continues from the source's last entry, and starts with the skills and objects bound there.
      const { state: prompt } = yield* TrajectoryStore.load(sourceFeed, Reducer.prompt).pipe(Effect.provide(dbLayer));
      const { state: session } = yield* TrajectoryStore.load(sourceFeed, Reducer.session).pipe(Effect.provide(dbLayer));
      const point = prompt.entries.at(-1)?.source[0];

      // Create a new chat, then record where it forks from and what it binds.
      const sourceName = Obj.getLabel(chat);
      const { object: newChat } = yield* Operation.invoke(
        AssistantOperation.CreateChat,
        { name: sourceName ? `${sourceName} (fork)` : undefined },
        { spaceId: db.spaceId },
      );
      yield* Operation.invoke(SpaceOperation.AddObject, { object: newChat }, { spaceId: db.spaceId });
      const newFeed = yield* Database.load(newChat.feed);

      const sender: Trajectory.Sender = { role: 'event', name: 'fork' };
      yield* TrajectoryStore.append(newFeed, [
        ...(point !== undefined
          ? [Trajectory.make({ payload: { _tag: 'fork', from: { feed: Ref.make(sourceFeed), event: point } }, sender })]
          : []),
        ...(session.skills.length > 0 || session.objects.length > 0
          ? [
              Trajectory.make({
                payload: { _tag: 'contextBind', skills: session.skills, objects: session.objects },
                sender: { role: 'event', name: 'context' },
              }),
            ]
          : []),
      ]).pipe(Effect.provide(dbLayer));

      if (companionTo) {
        // Wire the forked chat as a companion and switch to it without navigating away.
        Chat.linkCompanion({ chat: newChat, subject: companionTo });
        yield* Database.flush();
        const operationInvoker = yield* Capability.get(Capabilities.OperationInvoker);
        yield* Effect.promise(() =>
          operationInvoker.invokePromise(AssistantOperation.SetCurrentChat, { companionTo, chat: newChat }),
        );
      } else {
        // Navigate to the forked chat as a standalone plank.
        const chatPath = GraphPath.getObjectPathFromObject(newChat);
        yield* Operation.invoke(LayoutOperation.Open, { subject: [chatPath] });
      }

      return { object: newChat };
    }),
  ),
);

export default handler;
