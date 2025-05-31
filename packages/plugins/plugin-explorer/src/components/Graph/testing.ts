//
// Copyright 2025 DXOS.org
//

import { type AnyLiveObject, live, type Space } from '@dxos/client/echo';
import { Query, RelationSourceId, RelationTargetId } from '@dxos/echo-schema';
import { faker } from '@dxos/random';
import { DataType } from '@dxos/schema';
import { createObjectFactory, type ValueGenerator, type TypeSpec } from '@dxos/schema/testing';
import { range } from '@dxos/util';

// TODO(burdon): Factor out.
faker.seed(1);
const generator: ValueGenerator = {
  ...faker,
} as any as ValueGenerator;

const getObject = (objects: AnyLiveObject[]) => objects[Math.floor(Math.random() * objects.length)];

export const generate = async (space: Space) => {
  const createObjects = createObjectFactory(space.db, generator);

  const spec: TypeSpec[] = [
    { type: DataType.Organization, count: 5 },
    { type: DataType.Project, count: 5 },
    { type: DataType.Person, count: 10 },
  ];

  await space.db.schemaRegistry.register([DataType.Organization, DataType.Project, DataType.Person]);
  await createObjects(spec);

  // Add relations between objects.
  const { objects: contacts } = await space.db.query(Query.type(DataType.Person)).run();
  console.log('contacts', contacts.length);

  for (const _ of range(0)) {
    const source = getObject(contacts);
    const target = getObject(contacts);
    if (source.id === target.id) {
      continue;
    }

    space.db.add(
      live(DataType.HasRelationship, {
        kind: 'friend',
        [RelationSourceId]: source,
        [RelationTargetId]: target,
      }),
    );
  }
};
