//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { Obj, Ref, Type } from '@dxos/echo';
import { type Space } from '@dxos/react-client/echo';
import { Collection } from '@dxos/schema';

import { SpaceCapabilities } from '../../types';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(SpaceCapabilities.Repair, async ({ space }: { space: Space }) => {
      await removeQueryCollections(space);
      await ensureSystemCollection(space);
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
  const queryCollections = objects.filter((object) => Obj.getTypename(object) === 'dxos.org/type/QueryCollection');
  if (queryCollections.length === 0) {
    return;
  }

  rootCollection.objects = objects
    .filter((object) => Obj.getTypename(object) !== 'dxos.org/type/QueryCollection')
    .map((object) => Ref.make(object));
  queryCollections.forEach((object) => space.db.remove(object));
};

/**
 * Ensure the root collection has a system collection for StoredSchema.
 */
const ensureSystemCollection = async (space: Space) => {
  const rootCollection: Collection.Collection = await space.properties[Collection.Collection.typename]?.load();
  if (!rootCollection) {
    return;
  }

  const objects = await Promise.all(rootCollection.objects.map((ref) => ref.load()));
  const records = objects.find(
    (object) => Obj.instanceOf(Collection.Managed, object) && object.key === Type.getTypename(Type.PersistentType),
  );
  if (records) {
    return;
  }

  rootCollection.objects.push(Ref.make(Collection.makeManaged({ key: Type.getTypename(Type.PersistentType) })));
};
