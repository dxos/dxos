//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { AiContextBinder } from '@dxos/assistant';
import { Chat, DatabaseBlueprint, ProjectWizardBlueprint } from '@dxos/assistant-toolkit';
import { Blueprint } from '@dxos/blueprints';
import { Feed, Filter, Obj, Ref } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { Operation } from '@dxos/operation';
import { ClientCapabilities } from '@dxos/plugin-client/types';

import { AssistantBlueprint } from '#blueprints';
import { CreateChat } from './definitions';

const handler: Operation.WithHandler<typeof CreateChat> = CreateChat.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ db, name, addToSpace = true }) {
      const registry = yield* Capability.get(Capabilities.AtomRegistry);
      const client = yield* Capability.get(ClientCapabilities.Client);
      const space = client.spaces.get(db.spaceId);
      invariant(space, 'Space not found');
      const feed = space.db.add(Feed.make());
      const queueDxn = Feed.getQueueDxn(feed);
      invariant(queueDxn, 'Feed queue DXN not found.');
      const queue = space.queues.get(queueDxn);
      const chat = Chat.make({ name, feed: Ref.make(feed) });
      Obj.setParent(feed, chat);
      if (addToSpace) {
        space.db.add(chat);
      }

      // TODO(wittjosiah): This should be a space-level setting.
      // TODO(burdon): Clone when activated. Copy-on-write for template.
      const blueprints = yield* Effect.promise(() => db.query(Filter.type(Blueprint.Blueprint)).run());
      let defaultAssistantBlueprint = blueprints.find((blueprint) => blueprint.key === AssistantBlueprint.key);
      if (!defaultAssistantBlueprint) {
        defaultAssistantBlueprint = db.add(AssistantBlueprint.make());
      }
      let defaultDatabaseBlueprint = blueprints.find((blueprint) => blueprint.key === DatabaseBlueprint.key);
      if (!defaultDatabaseBlueprint) {
        defaultDatabaseBlueprint = db.add(DatabaseBlueprint.make());
      }
      let defaultProjectWizardBlueprint = blueprints.find((blueprint) => blueprint.key === ProjectWizardBlueprint.key);
      if (!defaultProjectWizardBlueprint) {
        defaultProjectWizardBlueprint = db.add(ProjectWizardBlueprint.make());
      }
      // Dynamic import to avoid circular dependency with the barrel that also exports BlueprintManagerHandlers.
      const { BlueprintManagerBlueprint } = yield* Effect.promise(() => import('@dxos/assistant-toolkit'));
      let defaultBlueprintManagerBlueprint = blueprints.find(
        (blueprint) => blueprint.key === BlueprintManagerBlueprint.key,
      );
      if (!defaultBlueprintManagerBlueprint) {
        defaultBlueprintManagerBlueprint = db.add(BlueprintManagerBlueprint.make());
      }

      const binder = new AiContextBinder({ queue, registry });
      yield* Effect.promise(() =>
        binder.use((b: AiContextBinder) =>
          b.bind({
            blueprints: [
              Ref.make(defaultAssistantBlueprint!),
              Ref.make(defaultDatabaseBlueprint!),
              Ref.make(defaultProjectWizardBlueprint!),
              Ref.make(defaultBlueprintManagerBlueprint!),
            ],
          }),
        ),
      );

      return { object: chat };
    }),
  ),
);

export default handler;
