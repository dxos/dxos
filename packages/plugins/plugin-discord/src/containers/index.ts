//
// Copyright 2026 DXOS.org
//

import { type ComponentType, lazy } from 'react';

export const DiscordChannelProperties: ComponentType<any> = lazy(() => import('./DiscordChannelProperties/index.ts'));
export const DiscordAgentSetup: ComponentType<any> = lazy(() => import('./DiscordAgentSetup/index.ts'));
