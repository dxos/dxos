//
// Copyright 2025 DXOS.org
//

import { contributes } from '@dxos/app-framework';
import { Blueprint, Prompt } from '@dxos/blueprints';
import { Obj, Ref, Type } from '@dxos/echo';
import { SpaceCapabilities } from '@dxos/plugin-space';
import { type Space } from '@dxos/react-client/echo';
import { Collection } from '@dxos/schema';

import { Assistant } from '../types';

export default () =>
  contributes(SpaceCapabilities.Repair, async ({ space }) => {
    await ensureSystemCollections(space);
  });

const ensureSystemCollections = async (space: Space) => {
  const rootCollection: Collection.Collection = await space.properties[Collection.Collection.typename]?.load();
  if (!rootCollection) {
    return;
  }

  const objects = await Promise.all(rootCollection.objects.map((ref) => ref.load()));
  const chats = objects.find(
    (object) => Obj.instanceOf(Collection.System, object) && object.key === Assistant.Chat.typename,
  );
  if (!chats) {
    const systemCollection = Collection.makeSystem({
      key: Assistant.Chat.typename,
    });
    rootCollection.objects.push(Ref.make(systemCollection));
  }

  const blueprints = objects.find(
    (object) => Obj.instanceOf(Collection.System, object) && object.key === Blueprint.Blueprint.typename,
  );
  if (!blueprints) {
    const systemCollection = Collection.makeSystem({
      key: Blueprint.Blueprint.typename,
    });
    rootCollection.objects.push(Ref.make(systemCollection));
  }

  const prompts = objects.find(
    (object) => Obj.instanceOf(Collection.System, object) && object.key === Type.getTypename(Prompt.Prompt),
  );
  if (!prompts) {
    const systemCollection = Collection.makeSystem({
      key: Type.getTypename(Prompt.Prompt),
    });
    rootCollection.objects.push(Ref.make(systemCollection));
  }
};
