//
// Copyright 2025 DXOS.org
//

import { type AppCapabilities } from '@dxos/app-toolkit';
import { Blueprint } from '@dxos/blueprints';
import { Ref } from '@dxos/echo';
import { Text } from '@dxos/schema';

import { Fetch, WebSearchHandlers } from './functions';

const BLUEPRINT_KEY = 'org.dxos.blueprint.web-search';

const make = () =>
  Blueprint.make({
    key: BLUEPRINT_KEY,
    name: 'Web Search',
    description: 'Search the web.',
    agentCanEnable: true,
    instructions: {
      source: Ref.make(Text.make()),
    },
    tools: Blueprint.toolDefinitions({ operations: [Fetch], tools: ['AnthropicWebSearch'] }),
  });

const blueprint: AppCapabilities.BlueprintDefinition = {
  key: BLUEPRINT_KEY,
  operations: WebSearchHandlers,
  make,
};

export default blueprint;
