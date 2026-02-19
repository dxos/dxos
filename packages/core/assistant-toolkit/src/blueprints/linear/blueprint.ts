//
// Copyright 2025 DXOS.org
//

import { ToolId } from '@dxos/ai';
import { Blueprint } from '@dxos/blueprints';
import { Ref } from '@dxos/echo';
import { Text } from '@dxos/schema';
import { trim } from '@dxos/util';

import { LinearFunctions } from './functions';

export const Key = 'dxos.org/blueprint/linear';

/**
 * Agent prompt instructions for managing hierarchical task lists.
 */
const instructions = trim`
  You are able to sync Linear workspaces.
  Sometimes sync does not complete in one go and you need to call the function again.

  Known workspaces:

  DXOS teamId: 1127c63a-6f77-4725-9229-50f6cd47321c
`;

export const make = () =>
  Blueprint.make({
    key: Key,
    name: 'Linear',
    description: 'Syncs Linear workspaces.',
    instructions: {
      source: Ref.make(Text.make(instructions)),
    },
    tools: [LinearFunctions.Sync].map((tool) => ToolId.make(tool.key)),
  });

export const functions = [LinearFunctions.Sync];
