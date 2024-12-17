//
// Copyright 2024 DXOS.org
//

import { type Input } from '@atlaskit/pragmatic-drag-and-drop/types';

import { type Point } from './geometry';

/**
 * Get the relative position of the input event with respect to the provided element.
 */
export const getInputPoint = (el: HTMLElement, input: Input): Point => {
  const rect = el.getBoundingClientRect();
  return {
    x: input.clientX - rect.left,
    y: input.clientY - rect.top,
  };
};
