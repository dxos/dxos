//
// Copyright 2025 DXOS.org
//

import { Blueprint, Template } from '@dxos/blueprints';
import { type FunctionDefinition } from '@dxos/functions';
import { trim } from '@dxos/util';

import { calendar } from '../functions';

export const Key = 'dxos.org/blueprint/calendar';

export const functions: FunctionDefinition[] = [calendar.sync];
export const tools: string[] = [];

export const make = () =>
  Blueprint.make({
    key: Key,
    name: 'Calendar',
    tools: Blueprint.toolDefinitions({ functions, tools }),
    instructions: Template.make({
      source: trim`
        You manage my calendar.
      `,
    }),
  });
