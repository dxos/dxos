//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    'index': 'src/index.ts',
    'SequencerPlugin': 'src/SequencerPlugin.tsx',
    'SequencerPlugin.node': 'src/SequencerPlugin.node.ts',
    'SequencerPlugin.workerd': 'src/SequencerPlugin.workerd.ts',
    'skills': 'src/skills/index.ts',
    'capabilities': 'src/capabilities/index.ts',
    'components': 'src/components/index.ts',
    'containers': 'src/containers/index.ts',
    'meta': 'src/meta.ts',
    'operations': 'src/operations/index.ts',
    'plugin': 'src/plugin.ts',
    'translations': 'src/translations.ts',
    'types': 'src/types/index.ts',
    'Score': 'src/types/Score.ts',
    'ScoreOperation': 'src/types/ScoreOperation.ts',
    'Sequence': 'src/types/Sequence.ts',
    'SequencerEvents': 'src/types/SequencerEvents.ts',
    'Track': 'src/types/Track.ts',
    'Note': 'src/types/Note.ts',
    'Patch': 'src/types/Patch.ts',
  },
  jsx: 'react',
  test: { node: true, storybook: true },
});
