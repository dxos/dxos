//
// Copyright 2025 DXOS.org
//

import { type Live, type Space } from '@dxos/client/echo';
import { create, getSchemaTypename, RelationSourceId, RelationTargetId } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';

import { DataType } from '../common';

const organizations: DataType.Organization[] = [
  //
  { id: 'dxos', name: 'DXOS', website: 'https://dxos.org' },
];

const people: DataType.Person[] = [
  //
  { id: 'rich_burdon', fullName: 'Rich Burdon' },
  { id: 'josiah_witt', fullName: 'Josiah Witt' },
  { id: 'dima_dmaretskyi', fullName: 'Dima Maretskyi' },
];

const testObjects: Record<string, any[]> = {
  [getSchemaTypename(DataType.Organization)!]: organizations,
  [getSchemaTypename(DataType.Person)!]: people,
};

const testRelationships: Record<
  string,
  ({
    source: string;
    target: string;
  } & Record<string, any>)[]
> = {
  [getSchemaTypename(DataType.Employer)!]: [
    { source: 'rich_burdon', target: 'dxos' },
    { source: 'josiah_witt', target: 'dxos' },
    { source: 'dima_dmaretskyi', target: 'dxos' },
  ],
};

export const addTestData = async (space: Space): Promise<void> => {
  const objectMap = new Map<string, Live<any>>();

  for (const [typename, objects] of Object.entries(testObjects)) {
    const schema = space.db.graph.schemaRegistry.getSchema(typename);
    invariant(schema, `Schema not found: ${typename}`);
    for (const { id, ...data } of objects) {
      const object = space.db.add(create(schema, data));
      objectMap.set(id, object);
    }
  }

  for (const [typename, relationships] of Object.entries(testRelationships)) {
    const schema = space.db.graph.schemaRegistry.getSchema(typename);
    invariant(schema, `Schema not found: ${typename}`);

    for (const { source, target, ...data } of relationships) {
      const sourceObject = objectMap.get(source);
      const targetObject = objectMap.get(target);
      invariant(sourceObject, `Source object not found: ${source}`);
      invariant(targetObject, `Target object not found: ${target}`);

      space.db.add(
        create(schema, {
          ...data,
          // TODO(burdon): Test source/target types match.
          [RelationSourceId]: sourceObject,
          [RelationTargetId]: targetObject,
        }),
      );
    }
  }
};
