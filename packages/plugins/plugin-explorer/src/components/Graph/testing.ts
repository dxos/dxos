//
// Copyright 2025 DXOS.org
//

import { type Space } from '@dxos/client/echo';
import { Query, Relation, type Obj } from '@dxos/echo';
import { RelationSourceId, RelationTargetId } from '@dxos/echo-schema';
import { DataType } from '@dxos/schema';
import { createObjectFactory, type ValueGenerator, type TypeSpec } from '@dxos/schema/testing';
import { range } from '@dxos/util';

const getObject = (objects: Obj.Any[]) => objects[Math.floor(Math.random() * objects.length)];

const defaultTypes: TypeSpec[] = [
  { type: DataType.Organization, count: 5 },
  { type: DataType.Project, count: 5 },
  { type: DataType.Person, count: 10 },
];

export type GenerateOptions = {
  spec?: TypeSpec[];
  relations?: {
    count: number;
    kind: string;
  };
};

const defaultRelations: GenerateOptions['relations'] = { kind: 'friend', count: 10 };

/**
 * @deprecated Use @dxos/schema.
 */
export const generate = async (
  space: Space,
  generator: ValueGenerator,
  { spec = defaultTypes, relations = defaultRelations }: GenerateOptions = {},
) => {
  const createObjects = createObjectFactory(space.db, generator);
  await createObjects(spec);

  // Add relations between objects.
  const { objects: contacts } = await space.db.query(Query.type(DataType.Person)).run();
  for (const _ of range(relations.count)) {
    const source = getObject(contacts);
    const target = getObject(contacts);
    if (source.id !== target.id) {
      space.db.add(
        Relation.make(DataType.HasRelationship, {
          kind: relations.kind,
          [RelationSourceId]: source,
          [RelationTargetId]: target,
        }),
      );
    }
  }
};
