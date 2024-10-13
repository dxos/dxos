//
// Copyright 2024 DXOS.org
//

import React, { type PropsWithChildren } from 'react';

export const TestPopup = ({ children }: PropsWithChildren) => (
  <div className='flex w-[240px] border border-separator rounded'>{children}</div>
);
