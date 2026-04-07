//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { Collection, Obj, Ref } from '@dxos/echo';
import { type Space } from '@dxos/react-client/echo';

import { SpaceCapabilities } from '#types';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(SpaceCapabilities.Repair, async ({ space }: { space: Space }) => {
      await removeQueryCollections(space);
    }),
  ),
);

/**
 * Remove all existing query collections from the root collection.
 */
const removeQueryCollections = async (space: Space) => {
  const rootCollection: Collection.Collection = await space.properties[Collection.Collection.typename]?.load();
  if (!rootCollection) {
    return;
  }

  const objects = await Promise.all(rootCollection.objects.map((ref) => ref.load()));
  const queryCollections = objects.filter((object) => Obj.getTypename(object) === 'org.dxos.type.queryCollection');
  if (queryCollections.length === 0) {
    return;
  }

  Obj.change(rootCollection, (obj) => {
    obj.objects = objects
      .filter((object) => Obj.getTypename(object) !== 'org.dxos.type.queryCollection')
      .map((object) => Ref.make(object));
  });
  queryCollections.forEach((object) => space.db.remove(object));
};
