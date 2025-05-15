//
// Copyright 2025 DXOS.org
//

import React, { type PropsWithChildren } from 'react';

import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

/**
 * A container component that maintains a 16:9 aspect ratio while centering its content.
 * The container will scale to fit within its parent's bounds while preserving the aspect ratio.
 *
 * Key features:
 * - Maintains 16:9 aspect ratio.
 * - Centers content both horizontally and vertically.
 * - Scales content to fit available space without distortion.
 * - Prevents layout shifts during initial render.
 *
 * @example
 * <ResponsiveContainer>
 *   <video />
 * </ResponsiveContainer>
 */
export const ResponsiveContainer = ({ children, classNames }: PropsWithChildren<ThemedClassName>) => {
  return (
    // Outer container that takes full size of parent.
    <div role='none' className='relative flex w-full h-full overflow-hidden'>
      {/* Absolute positioning layer for centering content. */}
      <div role='none' className='absolute inset-0 flex overflow-hidden items-center justify-center'>
        {/* Content container that maintains aspect ratio and proper scaling */}
        <div role='none' className={mx('aspect-video max-h-full max-w-full w-auto h-auto p-2', classNames)}>
          {children}
        </div>
      </div>
    </div>
  );
};
