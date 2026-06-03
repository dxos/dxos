//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { AiContext } from '@dxos/assistant';
import { Chat, DatabaseBlueprint, AgentWizardBlueprint } from '@dxos/assistant-toolkit';
import { Blueprint, Operation } from '@dxos/compute';
import { Feed, Filter, Obj, Ref } from '@dxos/echo';
import { createFeedServiceLayer } from '@dxos/echo-db';
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

      const feedServiceLayer = createFeedServiceLayer(space.queues);
      const runtime = yield* Effect.runtime<Feed.FeedService>().pipe(Effect.provide(feedServiceLayer));
      const binder = new AiContext.Binder({ feed, runtime, registry });

      // Build blueprint refs. Blueprints with valid DXN keys (no hyphens in the last segment) are
      // bound directly via registry refs — no DB clone needed. Blueprints with invalid DXN keys
      // (e.g. `agent-wizard`, `blueprint-manager`) must be cloned into the space first.
      const defaultDefs = [AssistantBlueprint, DatabaseBlueprint, AgentWizardBlueprint, BlueprintManagerBlueprint];
      const existingBlueprints = yield* Effect.promise(() => db.query(Filter.type(Blueprint.Blueprint)).run());
      const blueprintRefs: Ref.Ref<Blueprint.Blueprint>[] = [];

      for (const def of defaultDefs) {
        const uri = Blueprint.registryURI(def.key);
        if (uri) {
          // Valid DXN key — resolve directly from the registry via the ECHO ref resolver.
          blueprintRefs.push(Ref.fromURI(uri));
        } else {
          // Invalid DXN key — clone into space if not already present.
          let stored = existingBlueprints.find((bp) => Obj.getMeta(bp).key === def.key);
          if (!stored) {
            stored = db.add(def.make());
          }
          blueprintRefs.push(Ref.make(stored));
        }
      }

      yield* Effect.promise(() => binder.use((b: AiContext.Binder) => b.bind({ blueprints: blueprintRefs })));

      return { object: chat };
    }),
  ),
);

export default handler;
