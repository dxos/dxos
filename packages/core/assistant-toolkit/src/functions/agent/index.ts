//
// Copyright 2025 DXOS.org
//

import { type FunctionDefinition } from '@dxos/functions';

import { default as prompt$ } from './prompt';

export namespace AgentFunctions {
  // TODO(burdon): Temp fix for TS error.
  export const prompt: FunctionDefinition.Any = prompt$;
}
