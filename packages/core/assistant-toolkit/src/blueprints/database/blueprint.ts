//
// Copyright 2025 DXOS.org
//

import { type AppCapabilities } from '@dxos/app-toolkit';
import { Blueprint } from '@dxos/blueprints';
import { Ref } from '@dxos/echo';
import { Text } from '@dxos/schema';
import { trim } from '@dxos/util';

import {
  Query,
  Load,
  ObjectCreate,
  ObjectUpdate,
  ObjectDelete,
  SchemaAdd,
  SchemaList,
  ContextAdd,
  ContextRemove,
  RelationCreate,
  RelationDelete,
  TagAdd,
  TagRemove,
  DatabaseHandlers,
} from './functions';

const BLUEPRINT_KEY = 'org.dxos.blueprint.database';

const instructions = trim`
  You can query, create, update, and delete objects in ECHO.
  You can manage schemas, relations, tags, and add objects to the chat context.
`;

const make = () =>
  Blueprint.make({
    key: BLUEPRINT_KEY,
    name: 'Database',
    description: 'Query and manipulate objects in the ECHO database.',
    instructions: {
      source: Ref.make(Text.make(instructions)),
    },
    tools: Blueprint.toolDefinitions({
      operations: [
        Query,
        Load,
        ObjectCreate,
        ObjectUpdate,
        ObjectDelete,
        SchemaAdd,
        SchemaList,
        ContextAdd,
        ContextRemove,
        RelationCreate,
        RelationDelete,
        TagAdd,
        TagRemove,
      ],
    }),
  });

const blueprint: AppCapabilities.BlueprintDefinition = {
  key: BLUEPRINT_KEY,
  operations: DatabaseHandlers,
  make,
};

export default blueprint;
