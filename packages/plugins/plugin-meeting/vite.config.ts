//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    MeetingPlugin: 'src/MeetingPlugin.ts',
    capabilities: 'src/capabilities/index.ts',
    components: 'src/components/index.ts',
    containers: 'src/containers/index.ts',
    meta: 'src/meta.ts',
    operations: 'src/operations/index.ts',
    plugin: 'src/plugin.ts',
    translations: 'src/translations.ts',
    types: 'src/types/index.ts',
      'Meeting': 'src/types/Meeting.ts',
    'MeetingCapabilities': 'src/types/MeetingCapabilities.ts',
    'MeetingEvents': 'src/types/MeetingEvents.ts',
    'MeetingOperation': 'src/types/MeetingOperation.ts',
    'Settings': 'src/types/Settings.ts',
},
  jsx: 'react',
  test: { node: true, storybook: true },
});
