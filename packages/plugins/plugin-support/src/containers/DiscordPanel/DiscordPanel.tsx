//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { DiscordComponent } from './DiscordComponent';

export const DiscordPanel = () => (
  <DiscordComponent.Root>
    <div className='h-full grid grid-rows-[auto_minmax(0,1fr)_auto_auto] overflow-hidden bs-full is-full'>
      <DiscordComponent.Channels />
      <DiscordComponent.Content />
      <DiscordComponent.Header />
      <DiscordComponent.StatusBar />
    </div>
  </DiscordComponent.Root>
);
