//
// Copyright 2025 DXOS.org
//

import { Blueprint, Template } from '@dxos/blueprints';
import { type FunctionDefinition } from '@dxos/functions';
import { trim } from '@dxos/util';

export const functions: FunctionDefinition[] = [];
export const tools: string[] = [];

export const Key = 'dxos.org/blueprint/kanban';

export const make = () =>
  Blueprint.make({
    key: Key,
    name: 'Kanban',
    tools: Blueprint.toolDefinitions({ functions, tools }),
    instructions: Template.make({
      source: trim`
        You can create and update kanban boards to show data in sorted columns defined by schema.
      `,
    }),
  });
