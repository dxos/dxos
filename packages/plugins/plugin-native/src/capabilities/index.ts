//
// Copyright 2025 DXOS.org
//

import { lazy } from '@dxos/app-framework';

export const Ollama = lazy(() => import('./ollama'));
export const Updater = lazy(() => import('./updater'));
export const Window = lazy(() => import('./window'));
