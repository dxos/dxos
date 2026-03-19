//
// Copyright 2025 DXOS.org
//

import { type AppCapabilities } from '@dxos/app-toolkit';
import { Blueprint, Template } from '@dxos/blueprints';
import { OperationHandlerSet } from '@dxos/operation';
import { trim } from '@dxos/util';

const BLUEPRINT_KEY = 'org.dxos.blueprint.table';

const make = () =>
  Blueprint.make({
    key: BLUEPRINT_KEY,
    name: 'Table',
    tools: Blueprint.toolDefinitions({ tools: [] }),
    instructions: Template.make({
      source: trim`
        You can create and update tables to show data in sorted columns defined by schema.
      `,
    }),
  });

const blueprint: AppCapabilities.BlueprintDefinition = {
  key: BLUEPRINT_KEY,
  operations: OperationHandlerSet.empty,
  make,
};

export default blueprint;
