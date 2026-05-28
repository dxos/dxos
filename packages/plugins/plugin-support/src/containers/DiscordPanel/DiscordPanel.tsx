//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { DiscordComponent } from './DiscordComponent';

export const DiscordPanel = () => (
  <DiscordComponent.Root>
    <div className='h-full grid grid-rows-[auto_auto_minmax(0,1fr)_auto] overflow-hidden h-full is-full'>
      <DiscordComponent.Header />
      <DiscordComponent.Channels />
      <DiscordComponent.Content />
      <DiscordComponent.StatusBar />
    </div>
  </DiscordComponent.Root>
);
