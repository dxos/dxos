//
// Copyright 2024 DXOS.org
//

import React, { type PropsWithChildren } from 'react';

export const TestPopup = ({ children }: PropsWithChildren) => (
  <div className='flex w-[240px] p-2 border border-separator rounded'>{children}</div>
);
