//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    ObservabilityPlugin: 'src/ObservabilityPlugin.ts',
    capabilities: 'src/capabilities/index.ts',
    containers: 'src/containers/index.ts',
    meta: 'src/meta.ts',
    operations: 'src/operations/index.ts',
    plugin: 'src/plugin.ts',
    translations: 'src/translations.ts',
    ObservabilityAnnotation: 'src/types/ObservabilityAnnotation.ts',
    ObservabilityOptions: 'src/types/ObservabilityOptions.ts',
    ObservabilityCapabilities: 'src/types/ObservabilityCapabilities.ts',
    ObservabilityEvents: 'src/types/ObservabilityEvents.ts',
    ObservabilityOperation: 'src/types/ObservabilityOperation.ts',
    Settings: 'src/types/Settings.ts',
    types: 'src/types/index.ts',
  },
  jsx: 'react',
  test: { node: true, storybook: true },
});
