//
// Copyright 2022 DXOS.org
//

import React, { FC, Suspense } from 'react';

import { FrameDef } from '../../hooks';

/**
 * Viewport for frame.
 */
export const FrameContainer: FC<{ frame: FrameDef }> = ({ frame }) => {
  const Component = frame.runtime.Component;
  if (!Component) {
    return null;
  }

  return (
    <Suspense>
      <main className='flex flex-1 flex-col overflow-hidden'>
        <Component />
      </main>
    </Suspense>
  );
};
