//
// Copyright 2025 DXOS.org
//

import { contributes } from '@dxos/app-framework';
import { Obj, Ref, Type } from '@dxos/echo';
import { SpaceCapabilities } from '@dxos/plugin-space';
import { type Space } from '@dxos/react-client/echo';
import { Collection } from '@dxos/schema';

import { Channel } from '../types';

export default () =>
  contributes(SpaceCapabilities.Repair, async ({ space, isDefault }) => {
    if (isDefault) {
      return;
    }

    await ensureSystemCollection(space);
  });

const ensureSystemCollection = async (space: Space) => {
  const rootCollection: Collection.Collection = await space.properties[Collection.Collection.typename]?.load();
  if (!rootCollection) {
    return;
  }

  const objects = await Promise.all(rootCollection.objects.map((ref) => ref.load()));
  const channels = objects.find(
    (object) => Obj.instanceOf(Collection.System, object) && object.key === Type.getTypename(Channel.Channel),
  );
  if (channels) {
    return;
  }

  const systemCollection = Collection.makeSystem({
    key: Type.getTypename(Channel.Channel),
  });
  rootCollection.objects.push(Ref.make(systemCollection));
};
