//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';
import { Obj, Ref, Type } from '@dxos/echo';
import { SpaceCapabilities } from '@dxos/plugin-space';
import { type Space } from '@dxos/react-client/echo';
import { Collection } from '@dxos/schema';

import { Meeting } from '../../types';

export default Capability.makeModule(() =>
  Capability.contributes(SpaceCapabilities.Repair, async ({ space, isDefault }) => {
    if (isDefault) {
      return;
    }

    await ensureSystemCollection(space);
  }),
);

/**
 * Ensure the root collection has a system collection for Meetings.
 */
const ensureSystemCollection = async (space: Space) => {
  const rootCollection: Collection.Collection = await space.properties[Collection.Collection.typename]?.load();
  if (!rootCollection) {
    return;
  }

  const objects = await Promise.all(rootCollection.objects.map((ref) => ref.load()));
  const meetings = objects.find(
    (object) => Obj.instanceOf(Collection.Managed, object) && object.key === Type.getTypename(Meeting.Meeting),
  );
  if (meetings) {
    return;
  }

  rootCollection.objects.push(Ref.make(Collection.makeManaged({ key: Type.getTypename(Meeting.Meeting) })));
};
