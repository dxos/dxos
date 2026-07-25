//
// Copyright 2026 DXOS.org
//

import { expect, test } from '@playwright/test';

import { log } from '@dxos/log';

import { AppManager } from './app-manager';

if (process.env.DX_PWA !== 'false') {
  log.error('PWA must be disabled to run e2e tests. Set DX_PWA=false before running again.');
  process.exit(1);
}

// The statusIndicator role is the first Surface dispatched across a `<dx-surface-root>`
// web-component boundary (see composer main.tsx / the web-components project). This guards
// the flipped role end to end: the boundary element mounts in the sidebar rail and its
// detached React root renders the contributed indicator surfaces.
test.describe('Status indicator surface boundary', () => {
  let host: AppManager;

  test.beforeEach(async ({ browser }) => {
    host = new AppManager(browser, false);
    await host.init();
  });

  test.afterEach(async () => {
    await host.closePage();
  });

  test('status indicators render across the web-component boundary', async () => {
    const boundary = host.page.locator('dx-surface-root[data-role="org.dxos.role.statusIndicator"]');
    await expect(boundary).toHaveCount(1);
    // The detached root committed real content (contributed indicator surfaces render
    // asynchronously inside the boundary's own React root).
    await expect(boundary.locator(':scope > *').first()).toBeAttached();
  });
});
