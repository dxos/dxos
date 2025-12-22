//
// Copyright 2025 DXOS.org
//

import { contributes, defineCapabilityModule } from '@dxos/app-framework';
import { Blueprint, Prompt } from '@dxos/blueprints';
import { Obj, Ref, Type } from '@dxos/echo';
import { SpaceCapabilities } from '@dxos/plugin-space';
import { type Space } from '@dxos/react-client/echo';
import { Collection } from '@dxos/schema';

import { Assistant } from '../types';

export default defineCapabilityModule(() =>
  contributes(SpaceCapabilities.Repair, async ({ space }) => {
    await ensureSystemCollections(space);
  }),
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
    (object) => Obj.instanceOf(Collection.Managed, object) && object.key === Assistant.Chat.typename,
  );
  if (!chats) {
    rootCollection.objects.push(Ref.make(Collection.makeManaged({ key: Assistant.Chat.typename })));
  }

  const blueprints = objects.find(
    (object) => Obj.instanceOf(Collection.Managed, object) && object.key === Blueprint.Blueprint.typename,
  );
  if (!blueprints) {
    rootCollection.objects.push(Ref.make(Collection.makeManaged({ key: Blueprint.Blueprint.typename })));
  }

  const prompts = objects.find(
    (object) => Obj.instanceOf(Collection.Managed, object) && object.key === Type.getTypename(Prompt.Prompt),
  );
  if (!prompts) {
    rootCollection.objects.push(Ref.make(Collection.makeManaged({ key: Type.getTypename(Prompt.Prompt) })));
  }
};
