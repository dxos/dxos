//
// Copyright 2024 DXOS.org
//

import React, { type PropsWithChildren } from 'react';

/**
 * Main full screen app container (not used by storybooks).
 */
export const AppContainer = ({ children }: PropsWithChildren) => (
  <div className='flex fixed inset-0 justify-center overflow-hidden bg-neutral-100 dark:bg-neutral-800'>{children}</div>
);
