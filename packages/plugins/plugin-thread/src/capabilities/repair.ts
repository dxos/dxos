//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';
import { Obj, Ref, Type } from '@dxos/echo';
import { SpaceCapabilities } from '@dxos/plugin-space';
import { type Space } from '@dxos/react-client/echo';
import { Collection } from '@dxos/schema';

import { Channel } from '../types';

export default Capability.makeModule(() =>
  Capability.contributes(SpaceCapabilities.Repair, async ({ space, isDefault }: { space: Space; isDefault: boolean }) => {
    if (isDefault) {
      return;
    }

    await ensureSystemCollection(space);
  }),
);

/**
 * Ensure the root collection has a system collection for Channels.
 */
const ensureSystemCollection = async (space: Space) => {
  const rootCollection: Collection.Collection = await space.properties[Collection.Collection.typename]?.load();
  if (!rootCollection) {
    return;
  }

  const objects = await Promise.all(rootCollection.objects.map((ref) => ref.load()));
  const channels = objects.find(
    (object) => Obj.instanceOf(Collection.Managed, object) && object.key === Type.getTypename(Channel.Channel),
  );
  if (channels) {
    return;
  }

  rootCollection.objects.push(Ref.make(Collection.makeManaged({ key: Type.getTypename(Channel.Channel) })));
};
