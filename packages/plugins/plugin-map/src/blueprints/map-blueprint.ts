//
// Copyright 2025 DXOS.org
//

import { type AppCapabilities } from '@dxos/app-toolkit';
import { Blueprint, Template } from '@dxos/blueprints';
import { trim } from '@dxos/util';

const BLUEPRINT_KEY = 'dxos.org/blueprint/map';

const functions: AppCapabilities.BlueprintDefinition['functions'] = [];

const make = () =>
  Blueprint.make({
    key: BLUEPRINT_KEY,
    name: 'Map',
    tools: Blueprint.toolDefinitions({ functions, tools: [] }),
    instructions: Template.make({
      source: trim`
        You can create and update maps to show geospatial data.
      `,
    }),
  });

const blueprint: AppCapabilities.BlueprintDefinition = {
  key: BLUEPRINT_KEY,
  functions,
  make,
};

export default blueprint;
