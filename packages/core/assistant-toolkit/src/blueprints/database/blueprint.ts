//
// Copyright 2025 DXOS.org
//

import { type AppCapabilities } from '@dxos/app-toolkit';
import { Blueprint } from '@dxos/blueprints';
import { Ref } from '@dxos/echo';
import { Text } from '@dxos/schema';
import { trim } from '@dxos/util';

import { DatabaseFunctions } from './functions';

const BLUEPRINT_KEY = 'org.dxos.blueprint.database';

const instructions = trim`
  You can query, create, update, and delete objects in ECHO.
  You can manage schemas, relations, tags, and add objects to the chat context.
`;

const functions = Object.values(DatabaseFunctions);

const make = () =>
  Blueprint.make({
    key: BLUEPRINT_KEY,
    name: 'Database',
    description: 'Query and manipulate objects in the ECHO database.',
    instructions: {
      source: Ref.make(Text.make(instructions)),
    },
    tools: Blueprint.toolDefinitions({ functions }),
  });

const blueprint: AppCapabilities.BlueprintDefinition = {
  key: BLUEPRINT_KEY,
  functions,
  make,
};

export default blueprint;
