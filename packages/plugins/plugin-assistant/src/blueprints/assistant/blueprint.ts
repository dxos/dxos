//
// Copyright 2025 DXOS.org
//

import { type AppCapabilities } from '@dxos/app-toolkit';
import { templates } from '@dxos/assistant';
import { Blueprint } from '@dxos/blueprints';

const BLUEPRINT_KEY = 'dxos.org/blueprint/assistant';

const tools = ['open-item'];

const make = () =>
  Blueprint.make({
    key: BLUEPRINT_KEY,
    name: 'Assistant',
    tools: Blueprint.toolDefinitions({ tools }),
    instructions: templates.system,
  });

const blueprint: AppCapabilities.BlueprintDefinition = {
  key: BLUEPRINT_KEY,
  functions: [],
  make,
};

export default blueprint;
