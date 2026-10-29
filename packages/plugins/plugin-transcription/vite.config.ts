//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    TranscriptionSkill: 'src/skills/TranscriptionSkill.ts',
    TranscriptionOperationHandlerSet: 'src/operations/TranscriptionOperationHandlerSet.ts',
    index: 'src/index.ts',
    skills: 'src/skills/index.ts',
    components: 'src/components/index.ts',
    containers: 'src/containers/index.ts',
    hooks: 'src/hooks/index.ts',
    operations: 'src/operations/index.ts',
    translations: 'src/translations.ts',
    testing: 'src/testing/index.ts',
    Dictatable: 'src/types/Dictatable.ts',
    Settings: 'src/types/Settings.ts',
    TranscriptionCapabilities: 'src/types/TranscriptionCapabilities.ts',
    TranscriptionEvents: 'src/types/TranscriptionEvents.ts',
    TranscriptOperation: 'src/types/TranscriptOperation.ts',
    types: 'src/types/index.ts',
    Whistle: 'src/whistle/Whistle.ts',
  },
  jsx: 'react',
  test: { node: { environment: 'jsdom' }, storybook: true },
});
