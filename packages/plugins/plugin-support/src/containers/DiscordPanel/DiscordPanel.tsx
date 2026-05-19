//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { DiscordWidget } from './DiscordWidget';

export const DiscordPanel = () => (
  <DiscordWidget.Root>
    <DiscordWidget.Header />
    <DiscordWidget.Members />
    <DiscordWidget.Join />
  </DiscordWidget.Root>
);
