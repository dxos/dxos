//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { AiContext } from '@dxos/assistant';
import { AlarmBlueprint, Chat, DatabaseBlueprint, AgentWizardBlueprint } from '@dxos/assistant-toolkit';
import { Blueprint, Operation } from '@dxos/compute';
import { Database, Feed, Obj, Ref } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { ClientCapabilities } from '@dxos/plugin-client';

import { AssistantBlueprint } from '#blueprints';
import { AssistantOperation } from '#types';

const handler: Operation.WithHandler<typeof AssistantOperation.CreateChat> = AssistantOperation.CreateChat.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ db, name, addToSpace = true }) {
      const registry = yield* Capability.get(Capabilities.AtomRegistry);
      const client = yield* Capability.get(ClientCapabilities.Client);
      const space = client.spaces.get(db.spaceId);
      invariant(space, 'Space not found');
      const feed = space.db.add(Feed.make());
      const chat = Chat.make({ name, feed: Ref.make(feed) });
      Obj.setParent(feed, chat);
      if (addToSpace) {
        space.db.add(chat);
      }

      // Dynamic import to avoid circular dependency with the barrel that also exports BlueprintManagerHandlers.
      const { BlueprintManagerBlueprint } = yield* Effect.promise(() => import('@dxos/assistant-toolkit'));

      const runtime = yield* Effect.runtime<Database.Service>().pipe(Effect.provide(Database.layer(space.db)));
      const binder = new AiContext.Binder({ feed, runtime, registry });

      // Bind default blueprints via registry refs — no DB clone needed since the ECHO ref
      // resolver already spans the hypergraph registry.
      yield* Effect.promise(() =>
        binder.use((b: AiContext.Binder) =>
          b.bind({
            blueprints: [
              AssistantBlueprint,
              DatabaseBlueprint,
              AgentWizardBlueprint,
              BlueprintManagerBlueprint,
              AlarmBlueprint,
            ].map(({ key }) => Ref.fromURI(Blueprint.registryURI(key))),
            objects: [Ref.make(chat)],
          }),
        ),
      );

      return { object: chat };
    }),
  ),
);

export default handler;
