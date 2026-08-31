//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    'index': 'src/index.ts',
    'ai/AiObservability': 'src/ai/AiObservability.ts',
    'Observability': 'src/Observability.ts',
    'ObservabilityExtension': 'src/ObservabilityExtension.ts',
    'providers/ObservabilityClientProvider': 'src/providers/ObservabilityClientProvider.ts',
    'providers/ObservabilityProvider': 'src/providers/ObservabilityProvider.ts',
  },
  test: { node: true },
});
