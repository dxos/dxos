//
// Copyright 2025 DXOS.org
//

import React, { type PropsWithChildren } from 'react';

import { mx } from '@dxos/react-ui-theme';

/**
 * A container component that maintains the child's aspect ratio while centering its content.
 * The container will scale to fit within its parent's bounds while preserving the aspect ratio.
 *
 * @example
 * <ResponsiveContainer>
 *   <VideoObject />
 * </ResponsiveContainer>
 */
export const ResponsiveContainer = ({ children }: PropsWithChildren) => (
  // Outer container that takes full size of parent.
  <div role='none' className='relative flex w-full h-full'>
    {/* Absolute positioning layer for centering content. */}
    <div role='none' className='absolute inset-0 flex justify-center items-center'>
      {/* Content container that maintains given aspect ratio and proper scaling. */}
      <div role='none' className={mx('max-h-full max-w-full w-auto h-auto aspect-video')}>
        {children}
      </div>
    </div>
  </div>
);
