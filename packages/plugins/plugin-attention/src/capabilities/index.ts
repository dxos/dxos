//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';

export const IntentResolver = Capability.lazy('IntentResolver', () => import('./intent-resolver'));
export const Keyboard = Capability.lazy('Keyboard', () => import('./keyboard'));
export const ReactContext = Capability.lazy('ReactContext', () => import('./react-context'));

export * from './capabilities';
