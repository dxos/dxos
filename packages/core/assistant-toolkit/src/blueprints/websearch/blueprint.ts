//
// Copyright 2025 DXOS.org
//

import { ToolId } from '@dxos/ai';
import { type AppCapabilities } from '@dxos/app-toolkit';
import { Blueprint } from '@dxos/blueprints';
import { Ref } from '@dxos/echo';
import { Text } from '@dxos/schema';

const BLUEPRINT_KEY = 'dxos.org/blueprint/web-search';

const functions: AppCapabilities.BlueprintDefinition['functions'] = [];

const make = () =>
  Blueprint.make({
    key: BLUEPRINT_KEY,
    name: 'Web Search',
    description: 'Search the web.',
    instructions: {
      source: Ref.make(Text.make()),
    },
    tools: [ToolId.make('AnthropicWebSearch')],
  });

const blueprint: AppCapabilities.BlueprintDefinition = {
  key: BLUEPRINT_KEY,
  functions,
  make,
};

export default blueprint;
