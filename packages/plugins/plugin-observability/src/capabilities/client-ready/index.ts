//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';

import { type ClientReadyOptions } from './client-ready';

export const ClientReady = Capability.lazy<ClientReadyOptions>('ClientReady', () => import('./client-ready'));
