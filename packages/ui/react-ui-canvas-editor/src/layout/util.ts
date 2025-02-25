//
// Copyright 2024 DXOS.org
//

import { type Input } from '@atlaskit/pragmatic-drag-and-drop/types';

import { type Point } from '@dxos/react-ui-canvas';

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

/**
 * Create intersection type.
 */
// TODO(burdon): Move to util.
export type Intersection<Types extends readonly unknown[]> = Types extends [infer First, ...infer Rest]
  ? First & Intersection<Rest>
  : unknown;
