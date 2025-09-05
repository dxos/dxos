//
// Copyright 2025 DXOS.org
//

import { Capabilities, contributes } from '@dxos/app-framework';
import { Blueprint, Template } from '@dxos/blueprints';
import { type FunctionDefinition } from '@dxos/functions';
import { trim } from '@dxos/util';

import { gmailSync, open, summarize } from '../functions';

export const BLUEPRINT_KEY = 'dxos.org/blueprint/inbox';

const functions: FunctionDefinition[] = [gmailSync, open, summarize];
const tools: string[] = [];

export default () => {
  return [
    contributes(Capabilities.Functions, functions),
    contributes(
      Capabilities.BlueprintDefinition,
      Blueprint.make({
        key: BLUEPRINT_KEY,
        name: 'Inbox',
        tools: Blueprint.toolDefinitions({ functions, tools }),
        instructions: Template.make({
          source: trim`
            You manage my email inbox.
          `,
        }),
      }),
    ),
  ];
};
