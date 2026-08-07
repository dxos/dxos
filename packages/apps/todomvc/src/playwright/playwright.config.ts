//
// Copyright 2023 DXOS.org
//

import { defineConfig } from '@playwright/test';

import { e2ePreset } from '@dxos/test-utils/playwright';

export default defineConfig({
  ...e2ePreset(import.meta.dirname),
  // Serialized, unlike the shared preset's 2. Every test boots the app in `AppManager.init()`, and on
  // chromium it boots two (host + guest, for the WebRTC replication assertions) — so two workers put
  // up to four app boots on one runner at once. In run 31136163191 that pushed one webkit boot past
  // the 30s `waitFor` on `new-todo` and failed `cancel editing a task` in `beforeEach`, a test whose
  // subject is editing rather than boot latency. Deferring that test would have been arbitrary, since
  // `init()` is shared by all six. The suite costs 37-42s serialized and lands on the lightest cell,
  // well under the ~230s critical path, so the concurrency was buying nothing here.
  workers: 1,
  // Almost every assertion here waits on a change replicating from the host peer to the guest over
  // WebRTC, and Playwright's default `expect` timeout is 5s — which is what "eggnog never appeared
  // within 5s" was in run 31058008287. The two tests that failed are the two carrying the most state
  // across (a create followed immediately by an edit; four toggles at once), so they hit the bound
  // first while their lighter neighbours cleared it. Replication latency is not what any of these
  // tests is about, so give it a budget that reflects a real peer connection under CI load.
  expect: { timeout: 15_000 },
  // TODO(wittjosiah): Avoid hard-coding ports.
  webServer: {
    command: 'pnpm vite preview --port=9006',
    port: 9006,
    reuseExistingServer: false,
  },
});
