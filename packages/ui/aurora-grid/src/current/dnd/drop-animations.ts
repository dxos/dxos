//
// Copyright 2023 DXOS.org
//

import { defaultDropAnimationSideEffects, type DropAnimation } from '@dnd-kit/core';

export type OverlayDropAnimation = 'around' | 'away' | 'into';

export const dropAnimations: Record<OverlayDropAnimation, DropAnimation> = {
  around: {
    sideEffects: defaultDropAnimationSideEffects({
      styles: {
        active: {
          // opacity: '0',
        },
      },
    }),
  },
  away: {
    duration: 180,
    easing: 'ease-in',
    keyframes: ({ transform: { initial } }) => [
      {
        opacity: 1,
        transform: `translate(${initial.x}px, ${initial.y}px) scale(1, 1)`,
      },
      {
        opacity: 0,
        transform: `translate(${initial.x}px, ${initial.y}px) scale(1.33, 1.33)`,
        transformOrigin: '',
      },
    ],
    sideEffects: defaultDropAnimationSideEffects({
      styles: {
        active: {
          opacity: '1',
        },
      },
    }),
  },
  into: {
    duration: 180,
    easing: 'ease-in',
    keyframes: ({ transform: { initial } }) => [
      {
        opacity: 1,
        transform: `translate(${initial.x}px, ${initial.y}px) scale(1, 1)`,
      },
      {
        opacity: 0,
        transform: `translate(${initial.x}px, ${initial.y}px) scale(0.66, 0.66)`,
        transformOrigin: '',
      },
    ],
    sideEffects: defaultDropAnimationSideEffects({
      styles: {
        active: {
          opacity: '1',
        },
      },
    }),
  },
};
