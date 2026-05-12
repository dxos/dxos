//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    translations: 'src/translations.ts',
    types: 'src/types/index.ts',
    TemplatePlugin: 'src/TemplatePlugin.tsx',
    capabilities: 'src/capabilities/index.ts',
    components: 'src/components/index.ts',
    meta: 'src/meta.ts',
  },
  jsx: 'react',
  test: { node: { environment: 'happy-dom' } },
});
