//
// Copyright 2025 DXOS.org
//

import { type Live, type Space } from '@dxos/client/echo';
import { Obj, Relation, type Type } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { DataType } from '@dxos/schema';

export const testTypes: Type.Obj.Any[] = [
  DataType.Organization,
  DataType.Person,
  DataType.Employer,
  DataType.HasConnection,
];

export const organizations: (Type.Properties<DataType.Organization> & { id: string })[] = [
  { id: 'dxos', name: 'DXOS', website: 'https://dxos.org' },
  { id: 'socket_supply', name: 'Socket Supply', website: 'https://socketsupply.com' },
  { id: 'ink_and_switch', name: 'Ink & Switch', website: 'https://inkandswitch.com' },
  { id: 'effectful', name: 'Effectful', website: 'https://effect.co' },
  { id: 'blueyard', name: 'Blue Yard', website: 'https://blueyard.com' },
  { id: 'backed', name: 'Backed', website: 'https://backed.vc' },
  { id: 'protocol_labs', name: 'Protocol Labs', website: 'https://protocol.ai' },
  { id: 'newlab', name: 'Newlab', website: 'https://newlab.com' },
  { id: 'google', name: 'Google', website: 'https://google.com' },
  { id: 'microsoft', name: 'Microsoft', website: 'https://microsoft.com' },
  { id: 'openai', name: 'OpenAI', website: 'https://openai.com' },
  { id: 'anthropic', name: 'Anthropic', website: 'https://anthropic.com' },
  { id: 'amazon', name: 'Amazon', website: 'https://amazon.com' },
  { id: 'deshaw', name: 'D. E. Shaw & Co.', website: 'https://deshaw.com' },
];

const people: (Type.Properties<DataType.Person> & { id: string })[] = [
  { id: 'rich_burdon', fullName: 'Rich Burdon' },
  { id: 'josiah_witt', fullName: 'Josiah Witt' },
  { id: 'dima_dmaretskyi', fullName: 'Dima Maretskyi' },
  { id: 'chad_fowler', fullName: 'Chad Fowler' },
  { id: 'ciaran_oleary', fullName: "Ciarán O'Leary" },
  { id: 'jason_whitmire', fullName: 'Jason Whitmire' },
  { id: 'alex_brunicki', fullName: 'Alex Brunicki' },
  { id: 'andre_de_haes', fullName: 'Andre de Haes' },
  { id: 'scott_cohen', fullName: 'Scott Cohen' },
  { id: 'juan_benet', fullName: 'Juan Benet' },
  { id: 'satya_nadella', fullName: 'Satya Nadella' },
  { id: 'kevin_scott', fullName: 'Kevin Scott' },
  { id: 'jeff_bezos', fullName: 'Jeff Bezos' },
];

const testObjects: Record<string, any[]> = {
  [DataType.Organization.typename]: organizations,
  [DataType.Person.typename]: people,
};

const testRelationships: Record<
  string,
  ({
    source: string;
    target: string;
  } & Record<string, any>)[]
> = {
  [DataType.Employer.typename]: [
    // prettier-ignore
    { source: 'rich_burdon', target: 'dxos' },
    { source: 'rich_burdon', target: 'google', active: false }, // TODO(burdon): Should not contribute to force.
    { source: 'rich_burdon', target: 'deshaw', active: false },
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
    { source: 'jeff_bezos', target: 'amazon' },
    { source: 'jeff_bezos', target: 'deshaw', active: false },
  ],

  // TODO(burdon): Limit graph view to selected relationship types.
  [DataType.HasConnection.typename]: [
    // prettier-ignore
    { kind: 'partner', source: 'dxos', target: 'ink_and_switch' },
    { kind: 'partner', source: 'dxos', target: 'effectful' },
    { kind: 'partner', source: 'dxos', target: 'socket_supply' },

    // prettier-ignore
    { kind: 'investor', source: 'blueyard', target: 'dxos' },
    { kind: 'investor', source: 'blueyard', target: 'protocol_labs' },
    { kind: 'investor', source: 'protocol_labs', target: 'dxos' },
    { kind: 'investor', source: 'backed', target: 'dxos' },
    { kind: 'investor', source: 'newlab', target: 'dxos' },
    { kind: 'investor', source: 'microsoft', target: 'openai' },
    { kind: 'investor', source: 'google', target: 'anthropic' },
    { kind: 'investor', source: 'amazon', target: 'anthropic' },
  ],
};

export const addTestData = async (space: Space): Promise<void> => {
  const objectMap = new Map<string, Live<any>>();

  for (const [typename, objects] of Object.entries(testObjects)) {
    const schema = space.db.graph.schemaRegistry.getSchema(typename);
    invariant(schema, `Schema not found: ${typename}`);
    for (const { id, ...data } of objects) {
      const object = space.db.add(Obj.make(schema, data));
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
        Relation.make(schema, {
          // TODO(burdon): Test source/target types match.
          [Relation.Source]: sourceObject,
          [Relation.Target]: targetObject,
          ...data,
        }),
      );
    }
  }
};
