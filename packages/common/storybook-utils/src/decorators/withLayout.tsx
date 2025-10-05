//
// Copyright 2023 DXOS.org
//

import { type Decorator } from '@storybook/react';
import React from 'react';

import { mx } from '@dxos/react-ui-theme';

const screenClassName = 'fixed inset-0 bg-deckSurface';

export type LayoutType = 'fullscreen' | 'column' | 'centered';

/**
 * parameters: {
 *   layout: {
 *     type: 'fullscreen' | 'column' | 'centered'
 *     classNames?: string
 *   }
 * }
 */
export type LayoutOptions =
  | LayoutType
  | {
      type: LayoutType;
      classNames?: string;
    };

/**
 * Process layout parameter (add to preview.ts)
 */
export const withLayout: Decorator = (Story, { parameters: { layout } }) => {
  const { type, classNames } = typeof layout === 'string' ? { type: layout } : layout;

  switch (type) {
    // Fullscreen.
    case 'fullscreen':
      return (
        <div role='none' className={mx(screenClassName, 'flex flex-col overflow-hidden', classNames)}>
          <Story />
        </div>
      );

    // Centered column.
    case 'column':
      return (
        <div role='none' className={mx(screenClassName, 'flex justify-center overflow-hidden')}>
          <div
            role='none'
            className={mx('flex flex-col bs-full is-[40rem] overflow-hidden bg-baseSurface', classNames)}
          >
            <Story />
          </div>
        </div>
      );

    // Centered.
    case 'centered':
      return (
        <div role='none' className={mx(screenClassName, 'grid place-items-center')}>
          <div role='none' className={mx('contents', classNames)}>
            <Story />
          </div>
        </div>
      );

    default:
      return <Story />;
  }
};
