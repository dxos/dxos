//
// Copyright 2026 DXOS.org
//

import { installStressHarness } from './stress-harness.ts';

const STATUS_POLL_MS = 250;

installStressHarness();

// Human aid for driving the harness by hand; the Playwright driver reads `window.__workerStress`,
// never this element.
const status = document.getElementById('status');
setInterval(() => {
  if (status) {
    status.textContent = JSON.stringify(window.__workerStress?.status() ?? {}, null, 2);
  }
}, STATUS_POLL_MS);
