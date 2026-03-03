//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { Chat } from '@dxos/assistant-toolkit';
import { Blueprint, Prompt } from '@dxos/blueprints';
import { Obj, Ref, Type } from '@dxos/echo';
import { SpaceCapabilities } from '@dxos/plugin-space';
import { type Space } from '@dxos/react-client/echo';
import { Collection } from '@dxos/schema';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(SpaceCapabilities.Repair, async ({ space }) => {
      await ensureSystemCollections(space);
    }),
  ),
);

/**
 * Ensure the root collection has system collections for AI Chats, Blueprints, and Prompts.
 */
const ensureSystemCollections = async (space: Space) => {
  const rootCollection: Collection.Collection = await space.properties[Collection.Collection.typename]?.load();
  if (!rootCollection) {
    return;
  }

  const objects = await Promise.all(rootCollection.objects.map((ref) => ref.load()));
  const chats = objects.find(
    (object) => Obj.instanceOf(Collection.Managed, object) && object.key === Chat.Chat.typename,
  );
  if (!chats) {
    const chatsCollectionRef = Ref.make(Collection.makeManaged({ key: Chat.Chat.typename }));
    Obj.change(rootCollection, (c) => {
      c.objects.push(chatsCollectionRef);
    });
  }

  const blueprints = objects.find(
    (object) => Obj.instanceOf(Collection.Managed, object) && object.key === Blueprint.Blueprint.typename,
  );
  if (!blueprints) {
    const blueprintsCollectionRef = Ref.make(Collection.makeManaged({ key: Blueprint.Blueprint.typename }));
    Obj.change(rootCollection, (c) => {
      c.objects.push(blueprintsCollectionRef);
    });
  }

  const prompts = objects.find(
    (object) => Obj.instanceOf(Collection.Managed, object) && object.key === Type.getTypename(Prompt.Prompt),
  );
  if (!prompts) {
    const promptsCollectionRef = Ref.make(Collection.makeManaged({ key: Type.getTypename(Prompt.Prompt) }));
    Obj.change(rootCollection, (c) => {
      c.objects.push(promptsCollectionRef);
    });
  }
};
