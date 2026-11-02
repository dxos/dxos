//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    Canvas: 'src/types/Canvas.ts',
    CanvasCapabilities: 'src/types/CanvasCapabilities.ts',
    CanvasOperation: 'src/types/CanvasOperation.ts',
    Generator: 'src/types/Generator.ts',
    Settings: 'src/types/Settings.ts',
    Architecture: 'src/samples/architecture/index.ts',
    containers: 'src/containers/index.ts',
    model: 'src/model/index.ts',
    operations: 'src/operations/index.ts',
    skills: 'src/skills/index.ts',
    translations: 'src/translations.ts',
    types: 'src/types/index.ts',
  },
  jsx: 'react',
  test: { node: true, storybook: { timeout: 60_000 } },
});
