//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';

export const Ollama = Capability.lazy('Ollama', () => import('./ollama'));
export const SpotlightListener = Capability.lazy('SpotlightListener', () => import('./spotlight-listener'));
export const Updater = Capability.lazy('Updater', () => import('./updater'));
