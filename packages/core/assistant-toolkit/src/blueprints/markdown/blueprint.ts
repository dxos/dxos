//
// Copyright 2025 DXOS.org
//

import { type AppCapabilities } from '@dxos/app-toolkit';
import { Blueprint } from '@dxos/blueprints';
import { Ref } from '@dxos/echo';
import { Text } from '@dxos/schema';
import { trim } from '@dxos/util';

import { Create, Read, Update } from './functions';

const BLUEPRINT_KEY = 'org.dxos.blueprint.markdown';

const instructions = trim`
  You read, write & create markdown documents.
`;

const make = () =>
  Blueprint.make({
    key: BLUEPRINT_KEY,
    name: 'Markdown',
    description: 'Work with markdown documents.',
    agentCanEnable: true,
    instructions: {
      source: Ref.make(Text.make(instructions)),
    },
    tools: Blueprint.toolDefinitions({ operations: [Create, Read, Update] }),
  });

const blueprint: AppCapabilities.BlueprintDefinition = {
  key: BLUEPRINT_KEY,
  make,
};

export default blueprint;
