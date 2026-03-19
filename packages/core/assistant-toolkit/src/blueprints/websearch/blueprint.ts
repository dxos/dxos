//
// Copyright 2025 DXOS.org
//

import { type AppCapabilities } from '@dxos/app-toolkit';
import { Blueprint } from '@dxos/blueprints';
import { Ref } from '@dxos/echo';
import { Text } from '@dxos/schema';
import { WebSearchFunctions } from './functions';

const BLUEPRINT_KEY = 'org.dxos.blueprint.web-search';

const functions: AppCapabilities.BlueprintDefinition['functions'] = Object.values(WebSearchFunctions);

const make = () =>
  Blueprint.make({
    key: BLUEPRINT_KEY,
    name: 'Web Search',
    description: 'Search the web.',
    instructions: {
      source: Ref.make(Text.make()),
    },
    tools: Blueprint.toolDefinitions({ operations: functions, tools: ['AnthropicWebSearch'] }),
  });

const blueprint: AppCapabilities.BlueprintDefinition = {
  key: BLUEPRINT_KEY,
  functions,
  make,
};

export default blueprint;
