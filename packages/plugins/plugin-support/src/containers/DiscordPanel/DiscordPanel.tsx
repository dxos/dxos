//
// Copyright 2026 DXOS.org
//

import React from 'react';

import * as Layout from '@dxos/react-ui/Layout';

import { DiscordComponent } from './DiscordComponent.tsx';

export const DiscordPanel = () => (
  <DiscordComponent.Root>
    <Layout.Grid rows={['auto', 'auto', 'fill', 'auto']} classNames='dx-fill overflow-hidden'>
      <DiscordComponent.Header />
      <DiscordComponent.Channels />
      <DiscordComponent.Content />
      <DiscordComponent.StatusBar />
    </Layout.Grid>
  </DiscordComponent.Root>
);

DiscordPanel.displayName = 'DiscordPanel';
