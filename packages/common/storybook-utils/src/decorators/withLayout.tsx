//
// Copyright 2023 DXOS.org
//

import { type Decorator } from '@storybook/react';
import React from 'react';

import { mx } from '@dxos/react-ui-theme';

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
      scroll?: boolean;
      classNames?: string;
    };

/**
 * Process layout parameter (add to preview.ts)
 */
export const withLayout: Decorator = (Story, { parameters }) => {
  const { layout } = parameters;
  const { type, classNames, scroll } = typeof layout === 'object' ? layout : { type: layout };

  switch (type) {
    // Fullscreen.
    case 'fullscreen':
      return (
        <div role='none' className={mx('fixed inset-0 flex flex-col overflow-hidden bg-baseSurface', classNames)}>
          <Story />
        </div>
      );

    // Centered column.
    case 'column':
      return (
        <div role='none' className={mx('fixed inset-0 flex justify-center overflow-hidden bg-deckSurface')}>
          <div
            role='none'
            className={mx(
              'flex flex-col bs-full is-[40rem] bg-baseSurface border-is border-ie border-subduedSeparator',
              classNames,
              scroll ? 'overflow-y-auto' : 'overflow-hidden',
            )}
          >
            <Story />
          </div>
        </div>
      );

    // Centered.
    case 'centered':
      return (
        <div role='none' className={mx('fixed inset-0 grid place-items-center bg-deckSurface')}>
          <div role='none' className={mx('contents bg-baseSurface', classNames)}>
            <Story />
          </div>
        </div>
      );

    default:
      return <Story />;
  }
};
