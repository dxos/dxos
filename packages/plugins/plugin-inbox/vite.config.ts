//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    'index': 'src/index.ts',
    'InboxPlugin': 'src/InboxPlugin.tsx',
    'InboxPlugin.node': 'src/InboxPlugin.node.ts',
    'InboxPlugin.workerd': 'src/InboxPlugin.workerd.ts',
    'skills': 'src/skills/index.ts',
    'capabilities': 'src/capabilities/index.ts',
    'capabilities/node': 'src/capabilities/node.ts',
    'components': 'src/components/index.ts',
    'containers': 'src/containers/index.ts',
    'hooks': 'src/hooks/index.ts',
    'meta': 'src/meta.ts',
    'operations': 'src/operations/index.ts',
    'plugin': 'src/plugin.ts',
    'plugin.workerd': 'src/plugin.workerd.ts',
    'testing': 'src/testing/index.ts',
    'testing/node': 'src/testing/node.ts',
    'translations': 'src/translations.ts',
    'SyncOptions': 'src/types/SyncOptions.ts',
    'SyncStreamConfig': 'src/types/SyncStreamConfig.ts',
    'Calendar': 'src/types/Calendar.ts',
    'ExtractedFrom': 'src/types/ExtractedFrom.ts',
    'InboxCapabilities': 'src/types/InboxCapabilities.ts',
    'InboxEvents': 'src/types/InboxEvents.ts',
    'InboxOperation': 'src/types/InboxOperation.ts',
    'Mailbox': 'src/types/Mailbox.ts',
    'Settings': 'src/types/Settings.ts',
    'DraftEvent': 'src/types/DraftEvent.ts',
    'SystemTags': 'src/types/SystemTags.ts',
  },
  jsx: 'react',
  // Many stories here use `withClientProvider` (ECHO/Automerge-backed); per-file isolation
  // re-instantiates that WASM module graph for every story file and exhausts the single headless
  // chromium's WASM memory partway through the suite (`RangeError: ... Out of memory: Cannot
  // allocate Wasm memory for new instance`). Share the module graph across files instead.
  // The story's first render waits on the demand-gated activation pass (the Idle wave plus every
  // plugin's start event), which costs several seconds before the play can begin, so the 15s
  // browser-mode default no longer clears it.
  test: { node: true, storybook: { isolate: false, timeout: 60_000 } },
});
