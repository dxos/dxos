//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Skill from '@dxos/compute/Skill';
import { Ref, Type } from '@dxos/echo';
import * as SchemaEx from '@dxos/effect/SchemaEx';
import { Text } from '@dxos/schema';

import { getTypeTitle, types } from '../schema.ts';
import { CreateRecord, FindRecords, LinkRecords } from './operations.ts';

export const key = 'org.dxos.skill.echoSqliteDemoGraph';

/**
 * What the model is told about this graph, read from the schema rather than written out: a type
 * added to `schema.ts` describes itself here, as it already does in the toolbar, the cards and the
 * form.
 */
const describe = (type: Type.AnyObj): string => {
  const fields = SchemaEx.getProperties(Type.getSchema(type).ast)
    .map((property) => property.name)
    .filter((name) => name !== 'id');
  return `- \`${Type.getTypename(type)}\` — ${getTypeTitle(type)}: ${fields.join(', ')}`;
};

const instructions = [
  'You are working in a small graph database that the person is looking at.',
  '',
  'The graph holds these types:',
  ...types.map(describe),
  '',
  'Find records before you create one, so you do not add a second copy of something that is there.',
  'Create a record with its own fields only; point it at another record with the link tool, which',
  'takes the ids the find tool returns. A property that holds a list, such as an event’s attendees,',
  'gains each target in turn.',
  '',
  'Everything you write is visible at once to everyone else looking at this graph, and the person',
  'can delete it as easily as you made it. Say what you did, in a sentence.',
].join('\n');

export const make = () =>
  Skill.make({
    key,
    name: 'Graph',
    description: 'Read and write the records in this graph.',
    agentCanEnable: true,
    instructions: {
      source: Ref.make(Text.make({ content: instructions })),
    },
    tools: Skill.toolDefinitions({ operations: [FindRecords, CreateRecord, LinkRecords] }),
  });

export { GraphHandlers as Handlers } from './handlers.ts';
export * as Operations from './operations.ts';
