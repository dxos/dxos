//
// Copyright 2025 DXOS.org
//

import { Blueprint, Template } from '@dxos/blueprints';
import { type FunctionDefinition } from '@dxos/functions';
import { trim } from '@dxos/util';

import { gmail } from '../functions';

export const Key = 'dxos.org/blueprint/inbox-send';

export const functions: FunctionDefinition[] = [gmail.send];

export const tools: string[] = [];

export const make = () =>
  Blueprint.make({
    key: Key,
    name: 'Inbox (Send)',
    tools: Blueprint.toolDefinitions({ functions, tools }),
    instructions: Template.make({
      source: trim`
        You can send emails.

        There are more inbox-related tools in the "Inbox" blueprint.
        This blueprint is meant to be used in conjunction with the "Inbox" blueprint.
      `,
    }),
  });
