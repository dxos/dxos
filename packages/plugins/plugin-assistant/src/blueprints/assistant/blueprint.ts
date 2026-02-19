//
// Copyright 2025 DXOS.org
//

import { templates } from '@dxos/assistant';
import { Blueprint } from '@dxos/blueprints';

import { AssistantFunctions } from './functions';

export const Key = 'dxos.org/blueprint/assistant';

export const deckTools = ['open-item'];

export const functions = Object.values(AssistantFunctions);

export const tools = [...deckTools];

export const make = () =>
  Blueprint.make({
    key: Key,
    name: 'Assistant',
    tools: Blueprint.toolDefinitions({ functions, tools }),
    instructions: templates.system,
  });
