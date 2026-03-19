//
// Copyright 2025 DXOS.org
//

import { type AppCapabilities } from '@dxos/app-toolkit';
import { Blueprint, Template } from '@dxos/blueprints';
import { OperationHandlerSet } from '@dxos/operation';
import { trim } from '@dxos/util';

const BLUEPRINT_KEY = 'org.dxos.blueprint.map';

const make = () =>
  Blueprint.make({
    key: BLUEPRINT_KEY,
    name: 'Map',
    tools: Blueprint.toolDefinitions({ tools: [] }),
    instructions: Template.make({
      source: trim`
        You can create and update maps to show geospatial data.
      `,
    }),
  });

const blueprint: AppCapabilities.BlueprintDefinition = {
  key: BLUEPRINT_KEY,
  operations: OperationHandlerSet.empty,
  make,
};

export default blueprint;
