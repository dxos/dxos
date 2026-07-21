//
// Copyright 2026 DXOS.org
//

import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { z } from 'zod';

import { INITIAL_SPACE_COUNT, type Peer, countSpaces, createObject, createPeer, createSpace } from './composer';

describe('Basic tests', () => {
  let host: Peer;

  beforeEach(async () => {
    host = await createPeer();
  });

  afterEach(async () => {
    await host.close();
  });

  test('create identity, space is created by default', async () => {
    expect(await countSpaces(host)).toBe(INITIAL_SPACE_COUNT);

    // The welcome document plank lazy-loads after the boot marker — genuine asynchrony,
    // waited on with a deterministic text probe (extraction before the mount would
    // correctly report the heading as absent).
    await expect
      .poll(
        () =>
          host.page.evaluate(() =>
            [...document.querySelectorAll('h1, h2, [role="heading"]')].some((heading) =>
              heading.textContent?.includes('Welcome to Composer'),
            ),
          ),
        { timeout: 30_000, interval: 1_000 },
      )
      .toBe(true);
  });

  test('create space, which is displayed in tree', async () => {
    await createSpace(host);
    expect(await countSpaces(host)).toBe(INITIAL_SPACE_COUNT + 1);
  });

  test('create document', async () => {
    await createSpace(host);
    await createObject(host, 'Document');

    const state = await host.extract(
      'Inspect the current view: how many document items are listed in the space sidebar tree, and is a markdown text editor open and editable in the main content area?',
      z.object({
        documentCount: z.number().describe('number of document items listed under the space in the sidebar'),
        editorOpen: z.boolean().describe('whether an editable markdown editor is visible in the main area'),
      }),
    );
    expect(state.documentCount).toBe(1);
    expect(state.editorOpen).toBe(true);
  });

  // TODO(wittjosiah): Reset no longer wipes old data, upgrade path needs to be provided.
  test.skip('error boundary is rendered on invalid storage version, reset wipes old data', async () => {
    await createSpace(host);

    await host.page.evaluate(() => {
      (window as any).composer.changeStorageVersionInMetadata(9999);
    });
    const dialog = await host.extract(
      'Describe the error dialog on screen: what storage version does it mention and what is its title?',
      z.object({ version: z.string(), title: z.string() }),
    );
    expect(dialog.version).toContain('9999');
    expect(dialog.title).toContain('Invalid storage version');

    await host.act('Click the reset button in the error dialog');
    await host.act('Click the confirmation button to confirm the reset');
    // Reset reboots the app and re-creates the identity — a genuine asynchronous
    // transition, waited on with a deterministic (DOM) probe.
    await expect
      .poll(() => countSpaces(host), { timeout: 60_000, interval: 2_000 })
      .toBe(INITIAL_SPACE_COUNT);
  });

  // Reset triggers a full page reload and re-creates the identity, then waits up to 150s
  // for spaces to settle — well past the median-sized global timeout, so bump it here.
  test('reset device', { timeout: 210_000 }, async () => {
    await createSpace(host);
    expect(await countSpaces(host)).toBe(INITIAL_SPACE_COUNT + 1);

    await host.act('Click the "App menu" button at the top of the left sidebar');
    await host.act('Click the "Open user account" option in the open menu');
    await host.act('Click the "Devices" item in the user account panel');
    await host.act('Click the "Reset device" (reset storage) button in the devices panel');
    await host.act('Type "RESET" into the confirmation input in the reset dialog');
    await host.act('Click the confirm reset button in the reset dialog');

    // Reset triggers a full page reload and re-creates the identity from scratch — a
    // genuine asynchronous transition, waited on with a deterministic (DOM) probe that
    // rides through the reload.
    await expect
      .poll(() => countSpaces(host), { timeout: 150_000, interval: 2_000 })
      .toBe(INITIAL_SPACE_COUNT);
  });
});
