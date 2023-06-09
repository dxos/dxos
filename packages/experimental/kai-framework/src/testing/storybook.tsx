//
// Copyright 2023 DXOS.org
//

import React, { FC } from 'react';

// TODO(burdon): Move to test utils?.
export const FullScreen = (Story: FC) => (
  <div className='flex flex-col h-screen w-full'>
    <Story />
  </div>
);
