//
// Copyright 2025 DXOS.org
//

import { ToolId } from '@dxos/ai';
import { type AppCapabilities } from '@dxos/app-toolkit';
import { Blueprint } from '@dxos/blueprints';
import { Ref } from '@dxos/echo';
import { Text } from '@dxos/schema';
import { trim } from '@dxos/util';

import { LinearFunctions } from './functions';

const BLUEPRINT_KEY = 'dxos.org/blueprint/linear';

const functions = Object.values(LinearFunctions);

/**
 * Agent prompt instructions for managing hierarchical task lists.
 */
const instructions = trim`
  You are able to sync Linear workspaces.
  Sometimes sync does not complete in one go and you need to call the function again.

  Known workspaces:

  DXOS teamId: 1127c63a-6f77-4725-9229-50f6cd47321c
`;

const make = () =>
  Blueprint.make({
    key: BLUEPRINT_KEY,
    name: 'Linear',
    description: 'Syncs Linear workspaces.',
    instructions: {
      source: Ref.make(Text.make(instructions)),
    },
    tools: functions.map((tool) => ToolId.make(tool.key)),
  });

const blueprint: AppCapabilities.BlueprintDefinition = {
  key: BLUEPRINT_KEY,
  functions,
  make,
};

export default blueprint;
