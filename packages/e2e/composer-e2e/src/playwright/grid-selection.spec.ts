//
// Copyright 2026 DXOS.org
//

import { type Locator, expect, test } from '@playwright/test';

import { AppManager } from './app-manager.ts';
import { Grid } from './plugins/index.ts';

/** Shares the host's space with the guest, then has both open the object `open` finds. */
const shareAndOpen = async (host: AppManager, guest: AppManager, open: (app: AppManager) => Promise<void>) => {
  await host.shareSpace();
  const invitationCode = await host.createSpaceInvitation();
  const authCode = await host.getAuthCode();
  await guest.joinSpace();
  await guest.shell.acceptSpaceInvitation(invitationCode);
  await guest.shell.authenticate(authCode);
  await expect.poll(() => guest.workspaceId, { timeout: 30_000 }).toBe(host.workspaceId);
  await guest.waitForSpaceReady(30_000);
  await open(guest);
  await open(host);
};

/** A sheet is filed under the space's collections. */
const openSheet = async (app: AppManager) => {
  await app.expandSection('spacePlugin.collectionsSection');
  await app.navigateToObject(0);
};

/** A table is filed under its type in the space's database. */
const openTable = async (app: AppManager) => {
  await app.expandSection('spacePlugin.databaseSection');
  await app.expandSection('spacePlugin.schemaNode.org.dxos.type.task');
  await app.navigateToObject(0);
};

/**
 * Selects `select` on `scope`'s grid until `seen` shows a remote selection. Gossip reaches only the peers listening when
 * it is sent, so a selection made before the other client's channel is up is re-made rather than waited for.
 */
const selectUntilSeen = async (scope: Locator, select: () => Promise<void>, seen: Locator) => {
  await expect(async () => {
    await Grid.cell(scope, 0, 0).click();
    await select();
    await expect(Grid.remoteSelections(seen)).toHaveCount(1, { timeout: 2_000 });
  }).toPass({ timeout: 45_000 });
};

test.describe('Grid selections', () => {
  let host: AppManager;
  let guest: AppManager;

  test.beforeEach(async ({ browser }) => {
    test.setTimeout(120_000);
    host = new AppManager(browser, false);
    guest = new AppManager(browser, false);
    await host.init();
    await guest.init();
  });

  test.afterEach(async () => {
    if (host !== undefined && guest !== undefined) {
      await Promise.all([host.close(), guest.close()]);
    }
  });

  test("host and guest see each other's sheet selections until one leaves", { tag: ['@sheet:QA-5'] }, async () => {
    await host.createSpace();
    await host.createObject({ type: 'Sheet' });
    await shareAndOpen(host, guest, openSheet);

    const hostSheet = host.deck.plank().locator;
    const guestSheet = guest.deck.plank().locator;
    await Promise.all([
      expect(Grid.cell(hostSheet, 1, 2)).toBeVisible(),
      expect(Grid.cell(guestSheet, 1, 2)).toBeVisible(),
    ]);

    // A plank is narrow enough to show only columns A and B. The host selects A2:B3; the guest sees it outlined there, with the host's name on it.
    await selectUntilSeen(
      hostSheet,
      async () => {
        await Grid.cell(hostSheet, 0, 1).click();
        await Grid.cell(hostSheet, 1, 2).click({ modifiers: ['Shift'] });
      },
      guestSheet,
    );
    const hostSelection = Grid.remoteSelections(guestSheet);
    await expect(hostSelection).toHaveText(/\S/);
    await Grid.expectCovers(hostSelection, Grid.cell(guestSheet, 0, 1), Grid.cell(guestSheet, 1, 2));

    // The guest selects B5; the host sees it.
    await selectUntilSeen(guestSheet, () => Grid.cell(guestSheet, 1, 4).click(), hostSheet);
    await Grid.expectCovers(Grid.remoteSelections(hostSheet), Grid.cell(hostSheet, 1, 4));

    // Closing the sheet takes the guest's selection off the host's.
    await guest.deck.plank().close();
    await expect(Grid.remoteSelections(hostSheet)).toHaveCount(0);
  });

  // TODO(wittjosiah): A guest's navtree lists no tables under their type in the database, and a link to one falls back
  //   to Home, so the guest cannot open the table. Main does the same; unskip once a guest can open a table.
  test.skip('a table selection stays on its row when the other client sorts', { tag: ['@table:QA-4'] }, async () => {
    await host.createSpace();
    await host.createObject({ type: 'Table', name: 'Tasks', typename: 'org.dxos.type.task' });

    // Two rows, Bob then Alice. A task's title is required, so add-row opens a draft row; Enter edits its title and a
    // second Enter commits it.
    const hostTable = host.deck.plank().locator;
    for (const [row, name] of ['Bob', 'Alice'].entries()) {
      await Grid.cell(hostTable, 0, 0, 'frozenRowsEnd').click();
      await host.page.keyboard.press('Enter');
      await expect(host.page.getByTestId('grid.cell-editor').getByRole('textbox')).toBeFocused();
      await host.page.keyboard.type(name);
      await host.page.keyboard.press('Enter');
      await expect(Grid.cell(hostTable, 0, row)).toHaveText(name);
    }

    await shareAndOpen(host, guest, openTable);
    const guestTable = guest.deck.plank().locator;
    await expect(Grid.cell(guestTable, 0, 1)).toHaveText('Alice');

    // The host selects Alice's cell.
    await selectUntilSeen(hostTable, () => Grid.cell(hostTable, 0, 1).click(), guestTable);
    const hostSelection = Grid.remoteSelections(guestTable);
    await Grid.expectCovers(hostSelection, Grid.cell(guestTable, 0, 1));

    // Sorting moves Alice to the top on the guest, and the host's selection moves with her.
    await guestTable.getByTestId('table-column-settings-button').first().click();
    await guest.page.getByTestId('column-sort-ascending').click();
    await expect(Grid.cell(guestTable, 0, 0)).toHaveText('Alice');
    await Grid.expectCovers(hostSelection, Grid.cell(guestTable, 0, 0));
  });
});
