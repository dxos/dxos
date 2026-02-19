//
// Copyright 2025 DXOS.org
//

import { type FunctionDefinition } from '@dxos/functions';

import { default as Prompt } from './prompt';

export const AgentFunctions = {
  // TODO(burdon): Temp fix for TS error.
  Prompt: Prompt as FunctionDefinition.Any,
};
