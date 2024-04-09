//
// Copyright 2024 DXOS.org
//

import React, { type PropsWithChildren } from 'react';

/**
 * Main full screen app container (not used by storybooks).
 */
export const MainContainer = ({ children }: PropsWithChildren) => {
  return (
    <div className='flex absolute inset-0 justify-center overflow-hidden bg-neutral-100 dark:bg-neutral-800'>
      {children}
    </div>
  );
};
