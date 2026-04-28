//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';

export const NativeSettings = Capability.lazy('NativeSettings', () => import('./settings'));
export const Ollama = Capability.lazy('Ollama', () => import('./ollama'));
export const ReactSurface = Capability.lazy('ReactSurface', () => import('./react-surface'));
export const SpotlightListener = Capability.lazy('SpotlightListener', () => import('./spotlight-listener'));
export const SpotlightShortcut = Capability.lazy('SpotlightShortcut', () => import('./spotlight-shortcut'));
export const Updater = Capability.lazy('Updater', () => import('./updater'));
