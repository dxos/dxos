//
// Copyright 2025 DXOS.org
//

import { type FunctionDefinition } from '@dxos/functions';

import { default as prompt$ } from './prompt';

export namespace Agent {
  export const prompt: FunctionDefinition.Any = prompt$; // TODO(burdon): Temp fix for TS error.
}
