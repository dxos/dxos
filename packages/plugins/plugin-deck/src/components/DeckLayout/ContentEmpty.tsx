//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { Surface } from '@dxos/app-framework';

export const ContentEmpty = () => {
  return (
    <div
      role='none'
      className='min-bs-screen is-dvw sm:is-full flex items-center justify-center p-8'
      data-testid='layoutPlugin.firstRunMessage'
    >
      <div role='none' className='grid place-items-center grid-rows-[min-content_min-content]'>
        <Surface role='keyshortcuts' />
      </div>
    </div>
  );
};
