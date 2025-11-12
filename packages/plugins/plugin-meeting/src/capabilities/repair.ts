//
// Copyright 2025 DXOS.org
//

import { contributes } from '@dxos/app-framework';
import { Obj, Ref, Type } from '@dxos/echo';
import { SpaceCapabilities } from '@dxos/plugin-space';
import { type Space } from '@dxos/react-client/echo';
import { Collection } from '@dxos/schema';

import { Meeting } from '../types';

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
  const meetings = objects.find(
    (object) => Obj.instanceOf(Collection.System, object) && object.key === Type.getTypename(Meeting.Meeting),
  );
  if (meetings) {
    return;
  }

  const systemCollection = Collection.makeSystem({
    key: Type.getTypename(Meeting.Meeting),
  });
  rootCollection.objects.push(Ref.make(systemCollection));
};
