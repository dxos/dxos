//
// Copyright 2025 DXOS.org
//

import { type PluginContext, lazy } from '@dxos/app-framework';

import { type OllamaCapabilities } from './ollama';

export const Ollama = lazy<PluginContext, OllamaCapabilities>(() => import('./ollama'));
export const Updater = lazy(() => import('./updater'));
export const Window = lazy(() => import('./window'));
