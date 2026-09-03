//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    SequencerPlugin: 'src/SequencerPlugin.ts',
    plugin: 'src/plugin.tsx',
    skills: 'src/skills/index.ts',
    capabilities: 'src/capabilities/index.ts',
    components: 'src/components/index.ts',
    containers: 'src/containers/index.ts',
    meta: 'src/meta.ts',
    operations: 'src/operations/index.ts',
    translations: 'src/translations.ts',
    Score: 'src/types/Score.ts',
    ScoreOperation: 'src/types/ScoreOperation.ts',
    Sequence: 'src/types/Sequence.ts',
    SequencerEvents: 'src/types/SequencerEvents.ts',
    Track: 'src/types/Track.ts',
    Note: 'src/types/Note.ts',
    Patch: 'src/types/Patch.ts',
    types: 'src/types/index.ts',
  },
  jsx: 'react',
  test: { node: true, storybook: true },
});
