//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    'ns/IllustratorOperationHandlerSet': 'src/IllustratorOperationHandlerSet.ts',
    'ns/IllustratorModel': 'src/IllustratorModel.ts',
    'ns/SceneSvg': 'src/SceneSvg.ts',
    'index': 'src/index.ts',
    'IllustratorPlugin': 'src/IllustratorPlugin.ts',
    'plugin': 'src/plugin.tsx',
    'capabilities': 'src/capabilities/index.ts',
    'components': 'src/components/index.ts',
    'containers': 'src/containers/index.ts',
    'meta': 'src/meta.ts',
    'model': 'src/model/index.ts',
    'operations': 'src/operations/index.ts',
    'skills': 'src/skills/index.ts',
    'DrawingSkill': 'src/skills/DrawingSkill.ts',
    'translations': 'src/translations.ts',
    'util': 'src/util/index.ts',
    'Drawing': 'src/types/Drawing.ts',
    'LegacySketch': 'src/types/LegacySketch.ts',
    'SceneSvg': 'src/components/SceneSvg.tsx',
    'DrawingOperation': 'src/types/DrawingOperation.ts',
    'IllustratorCapabilities': 'src/types/IllustratorCapabilities.ts',
    'IllustratorError': 'src/types/IllustratorError.ts',
    'IllustratorEvents': 'src/types/IllustratorEvents.ts',
    'types': 'src/types/index.ts',
  },
  jsx: 'react',
  test: { node: true, workerd: true },
});
