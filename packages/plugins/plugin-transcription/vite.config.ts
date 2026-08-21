//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    'TranscriptionSkill': 'src/skills/TranscriptionSkill.ts',
    'TranscriptionOperationHandlerSet': 'src/operations/TranscriptionOperationHandlerSet.ts',
    'index': 'src/index.ts',
    'TranscriptionPlugin': 'src/TranscriptionPlugin.ts',
    'plugin': 'src/plugin.tsx',
    'skills': 'src/skills/index.ts',
    'capabilities': 'src/capabilities/index.ts',
    'capabilities.workerd': 'src/capabilities/gen/workerd.ts',
    'capabilities.node': 'src/capabilities/gen/node.ts',
    'components': 'src/components/index.ts',
    'containers': 'src/containers/index.ts',
    'hooks': 'src/hooks/index.ts',
    'meta': 'src/meta.ts',
    'operations': 'src/operations/index.ts',
    'translations': 'src/translations.ts',
    'testing': 'src/testing/index.ts',
    'Settings': 'src/types/Settings.ts',
    'TranscriptionCapabilities': 'src/types/TranscriptionCapabilities.ts',
    'TranscriptionEvents': 'src/types/TranscriptionEvents.ts',
    'TranscriptOperation': 'src/types/TranscriptOperation.ts',
    'types': 'src/types/index.ts',
  },
  jsx: 'react',
  test: { node: { environment: 'jsdom' }, storybook: true },
});
