//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { DiscordWidget } from './DiscordWidget';

export const DiscordPanel = () => (
  <DiscordWidget.Root>
    <div className='grid grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden bs-full is-full'>
      <DiscordWidget.Header />
      <DiscordWidget.Content />
      <DiscordWidget.StatusBar />
    </div>
  </DiscordWidget.Root>
);
