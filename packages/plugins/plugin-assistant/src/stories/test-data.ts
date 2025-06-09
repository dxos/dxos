//
// Copyright 2025 DXOS.org
//

import { type Live, type Space } from '@dxos/client/echo';
import { create, getSchemaTypename, RelationSourceId, RelationTargetId } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { DataType } from '@dxos/schema';

const organizations: DataType.Organization[] = [
  {
    id: 'dxos',
    name: 'DXOS',
    website: 'https://dxos.org',
  },
  {
    id: 'blueyard',
    name: 'Blue Yard',
    website: 'https://blueyard.com',
  },
  {
    id: 'backed',
    name: 'Backed',
    website: 'https://backed.vc',
  },
  {
    id: 'newlab',
    name: 'Newlab',
    website: 'https://newlab.com',
  },
  {
    id: 'protocol_labs',
    name: 'Protocol Labs',
    website: 'https://protocol.ai',
  },
  {
    id: 'google',
    name: 'Google',
    website: 'https://google.com',
  },
  {
    id: 'microsoft',
    name: 'Microsoft',
    website: 'https://microsoft.com',
  },
  {
    id: 'openai',
    name: 'OpenAI',
    website: 'https://openai.com',
  },
];

const people: DataType.Person[] = [
  {
    id: 'rich_burdon',
    fullName: 'Rich Burdon',
  },
  {
    id: 'josiah_witt',
    fullName: 'Josiah Witt',
  },
  {
    id: 'dima_dmaretskyi',
    fullName: 'Dima Dmaretskyi',
  },
  {
    id: 'chad_fowler',
    fullName: 'Chad Fowler',
  },
  {
    id: 'ciaran_oleary',
    fullName: "Ciarán O'Leary",
  },
  {
    id: 'jason_whitmire',
    fullName: 'Jason Whitmire',
  },
  {
    id: 'alex_brunicki',
    fullName: 'Alex Brunicki',
  },
  {
    id: 'andre_de_haes',
    fullName: 'Andre de Haes',
  },
  {
    id: 'scott_cohen',
    fullName: 'Scott Cohen',
  },
  {
    id: 'juan_benet',
    fullName: 'Juan Benet',
  },
  {
    id: 'satya_nadella',
    fullName: 'Satya Nadella',
  },
  {
    id: 'kevin_scott',
    fullName: 'Kevin Scott',
  },
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
    { source: 'rich_burdon', target: 'google', active: false }, // TODO(burdon): Should not contribute to force.
    { source: 'josiah_witt', target: 'dxos' },
    { source: 'dima_dmaretskyi', target: 'dxos' },
    { source: 'chad_fowler', target: 'blueyard' },
    { source: 'chad_fowler', target: 'microsoft', active: false },
    { source: 'ciaran_oleary', target: 'blueyard' },
    { source: 'jason_whitmire', target: 'blueyard' },
    { source: 'juan_benet', target: 'protocol_labs' },
    { source: 'alex_brunicki', target: 'backed' },
    { source: 'andre_de_haes', target: 'backed' },
    { source: 'scott_cohen', target: 'newlab' },
    { source: 'satya_nadella', target: 'microsoft' },
    { source: 'kevin_scott', target: 'microsoft' },
    { source: 'kevin_scott', target: 'google', active: false },
  ],
  [getSchemaTypename(DataType.HasConnection)!]: [
    { kind: 'investor', source: 'blueyard', target: 'dxos' },
    { kind: 'investor', source: 'blueyard', target: 'protocol_labs' },
    { kind: 'investor', source: 'backed', target: 'dxos' },
    { kind: 'investor', source: 'newlab', target: 'dxos' },
    { kind: 'investor', source: 'microsoft', target: 'openai' },
  ],
};

export const addTestData = (space: Space): void => {
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
          // TODO(burdon): Test type.
          [RelationSourceId]: sourceObject,
          [RelationTargetId]: targetObject,
        }),
      );
    }
  }
};
