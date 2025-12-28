//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';

import { type OllamaCapabilities } from './ollama';

export const Ollama = Capability.lazy<Capability.PluginContext, OllamaCapabilities>('Ollama', () => import('./ollama'));
export const Updater = Capability.lazy('Updater', () => import('./updater'));
export const Window = Capability.lazy('Window', () => import('./window'));
