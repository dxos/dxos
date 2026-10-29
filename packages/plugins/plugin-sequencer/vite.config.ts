//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    skills: 'src/skills/index.ts',
    components: 'src/components/index.ts',
    containers: 'src/containers/index.ts',
    operations: 'src/operations/index.ts',
    translations: 'src/translations.ts',
    Score: 'src/types/Score.ts',
    ScoreOperation: 'src/types/ScoreOperation.ts',
    Sequence: 'src/types/Sequence.ts',
    SequencerEvents: 'src/types/SequencerEvents.ts',
    Track: 'src/types/Track.ts',
    Instrument: 'src/types/Instrument.ts',
    Note: 'src/types/Note.ts',
    Patch: 'src/types/Patch.ts',
    types: 'src/types/index.ts',
  },
  jsx: 'react',
  test: { node: true, storybook: true },
});
