//
// Copyright 2024 DXOS.org
//

import { type Input } from '@atlaskit/pragmatic-drag-and-drop/types';

/**
 * Map from event, etc.
 */
export const getInputPoint = (input: Input) => ({
  x: input.clientX,
  y: input.clientY,
});
