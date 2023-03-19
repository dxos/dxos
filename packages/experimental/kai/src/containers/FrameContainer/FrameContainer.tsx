//
// Copyright 2022 DXOS.org
//

import React, { FC, Suspense } from 'react';

import { FrameContext } from '../../hooks';
import { FrameDef } from '../../registry';

/**
 * Frame component container and context.
 */
export const FrameContainer: FC<{ frame: FrameDef<any> }> = ({ frame }) => {
  const Component = frame.runtime.Component;
  if (!Component) {
    return null;
  }

  // TODO(burdon): 1. Factor out creating default item if not found (pass-in runtime).
  // TODO(burdon): 2. Factor out list.
  // TODO(burdon): 3. Pass in current object.

  return (
    <main className='flex flex-1 flex-col overflow-hidden'>
      <FrameContext.Provider value={{ frameDef: frame }}>
        <Suspense>
          <Component />
        </Suspense>
      </FrameContext.Provider>
    </main>
  );
};
