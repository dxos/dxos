//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';

export const Ollama = Capability.lazy('Ollama', () => import('./ollama'));
