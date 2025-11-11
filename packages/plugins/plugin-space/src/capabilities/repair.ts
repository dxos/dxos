//
// Copyright 2025 DXOS.org
//

import { contributes } from '@dxos/app-framework';
import { Obj, Ref } from '@dxos/echo';
import { type Space } from '@dxos/react-client/echo';
import { Collection, StoredSchema } from '@dxos/schema';

import { SpaceCapabilities } from './capabilities';

export default () =>
  contributes(SpaceCapabilities.Repair, async ({ space }) => {
    await removeQueryCollections(space);
    await ensureSystemCollection(space);
  });

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

const ensureSystemCollection = async (space: Space) => {
  const rootCollection: Collection.Collection = await space.properties[Collection.Collection.typename]?.load();
  if (!rootCollection) {
    return;
  }

  const objects = await Promise.all(rootCollection.objects.map((ref) => ref.load()));
  const records = objects.find(
    (object) => Obj.instanceOf(Collection.System, object) && object.key === StoredSchema.typename,
  );
  if (records) {
    return;
  }

  const systemCollection = Collection.makeSystem({
    key: StoredSchema.typename,
  });
  rootCollection.objects.push(Ref.make(systemCollection));
};
