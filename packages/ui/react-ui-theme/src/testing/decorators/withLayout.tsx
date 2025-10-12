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
 *     className?: string
 *   }
 * }
 */
export type LayoutOptions =
  | LayoutType
  | {
      type: LayoutType;
      scroll?: boolean;
      className?: string;
    };

/**
 * Process layout parameter (add to preview.ts)
 */
export const withLayout: Decorator = (Story, context) => {
  const {
    parameters: { layout },
  } = context;
  const { type, className, scroll } = typeof layout === 'object' ? layout : { type: layout };

  switch (type) {
    // Fullscreen.
    case 'fullscreen':
      return (
        <div role='none' className={mx('fixed inset-0 flex flex-col overflow-hidden bg-baseSurface', className)}>
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
              className,
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
          <div role='none' className={mx('bg-baseSurface', className ?? 'contents')}>
            <Story />
          </div>
        </div>
      );

    default:
      return <Story />;
  }
};
