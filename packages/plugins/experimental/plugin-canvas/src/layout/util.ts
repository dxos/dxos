//
// Copyright 2024 DXOS.org
//

/**
 * Map from event, etc.
 */
export const getInputPoint = (input: { clientX: number; clientY: number }) => ({
  x: input.clientX,
  y: input.clientY,
});
