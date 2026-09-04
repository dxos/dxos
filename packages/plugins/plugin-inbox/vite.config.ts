//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    'InboxSendSkill': 'src/skills/InboxSendSkill.ts',
    'InboxSkill': 'src/skills/InboxSkill.ts',
    'CalendarSkill': 'src/skills/CalendarSkill.ts',
    'MessageExtractor': 'src/operations/extractor/index.ts',
    'FeedCursor': 'src/operations/FeedCursor.ts',
    'InboxOperationHandlerSet': 'src/operations/InboxOperationHandlerSet.ts',
    'index': 'src/index.ts',
    'InboxPlugin': 'src/InboxPlugin.ts',
    'plugin': 'src/plugin.tsx',
    'skills': 'src/skills/index.ts',
    'sync': 'src/sync/index.ts',
    'capabilities': 'src/capabilities/index.ts',
    'components': 'src/components/index.ts',
    'containers': 'src/containers/index.ts',
    'hooks': 'src/hooks/index.ts',
    'meta': 'src/meta.ts',
    'operations': 'src/operations/index.ts',
    'testing': 'src/testing/index.ts',
    'testing/sync-fixture': 'src/testing/sync-fixture.ts',
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
    'MailSend': 'src/types/MailSend.ts',
    'ReplyGeneration': 'src/types/ReplyGeneration.ts',
    'types': 'src/types/index.ts',
  },
  jsx: 'react',
  // Many stories here use `withClientProvider` (ECHO/Automerge-backed); per-file isolation
  // re-instantiates that WASM module graph for every story file and exhausts the single headless
  // chromium's WASM memory partway through the suite (`RangeError: ... Out of memory: Cannot
  // allocate Wasm memory for new instance`). Share the module graph across files instead.
  // The first story in a file pays the whole lazy module-load bill — tens of seconds, against a
  // couple for each story after it — which the 15s browser-mode default cannot cover.
  test: { node: true, storybook: { isolate: false, timeout: 60_000 } },
});
