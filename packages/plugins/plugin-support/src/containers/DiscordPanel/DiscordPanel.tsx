//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { DiscordComponent } from './DiscordComponent.tsx';

export const DiscordPanel = () => (
  <DiscordComponent.Root>
    <div className='dx-fill grid grid-rows-[auto_auto_minmax(0,1fr)_auto] overflow-hidden'>
      <DiscordComponent.Header />
      <DiscordComponent.Channels />
      <DiscordComponent.Content />
      <DiscordComponent.StatusBar />
    </div>
  </DiscordComponent.Root>
);

DiscordPanel.displayName = 'DiscordPanel';
