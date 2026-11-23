//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    bridge: 'src/bridge/index.ts',
    components: 'src/components/index.ts',
    operations: 'src/operations/index.ts',
    recorder: 'src/recorder/index.ts',
    translations: 'src/translations.ts',
    MeetingRecorderCapabilities: 'src/types/MeetingRecorderCapabilities.ts',
    MeetingRecorderEvents: 'src/types/MeetingRecorderEvents.ts',
    MeetingRecorderOperation: 'src/types/MeetingRecorderOperation.ts',
    Settings: 'src/types/Settings.ts',
    types: 'src/types/index.ts',
  },
  jsx: 'react',
  test: { node: true },
});
