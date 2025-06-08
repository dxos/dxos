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
    id: 'microsoft',
    name: 'Microsoft',
    website: 'https://microsoft.com',
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

const testRelationships: Record<string, ({ source: string; targets: string[] } & Record<string, any>)[]> = {
  [getSchemaTypename(DataType.Employer)!]: [
    {
      source: 'dxos',
      targets: ['rich_burdon', 'josiah_witt', 'dima_dmaretskyi'],
    },
    {
      source: 'blueyard',
      targets: ['chad_fowler', 'ciaran_oleary', 'jason_whitmire'],
    },
    {
      source: 'protocol_labs',
      targets: ['juan_benet'],
    },
    {
      source: 'backed',
      targets: ['alex_brunicki', 'andre_de_haes'],
    },
    {
      source: 'newlab',
      targets: ['scott_cohen'],
    },
    {
      source: 'microsoft',
      targets: ['satya_nadella', 'kevin_scott'],
    },
  ],
  [getSchemaTypename(DataType.HasRelationship)!]: [
    {
      kind: 'investor',
      source: 'blueyard',
      targets: ['dxos', 'protocol_labs'],
    },
    {
      kind: 'investor',
      source: 'backed',
      targets: ['dxos'],
    },
    {
      kind: 'investor',
      source: 'newlab',
      targets: ['dxos'],
    },
  ],
};

export const addTestData = (space: Space) => {
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
    for (const { source, targets, ...data } of relationships) {
      const sourceObject = objectMap.get(source);
      invariant(sourceObject, `Source object not found: ${source}`);
      for (const target of targets) {
        const targetObject = objectMap.get(target);
        invariant(targetObject, `Target object not found: ${target}`);
        space.db.add(
          create(schema, {
            ...data,
            [RelationSourceId]: sourceObject,
            [RelationTargetId]: targetObject,
          }),
        );
      }
    }
  }
};
