//
// Copyright 2026 DXOS.org
//

import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { z } from 'zod';

import { type Peer, createObject, createPeer, createSpace, dragBetween, expandCollections } from './composer';

const collectionNames = z.object({
  names: z.array(z.string()).describe('the names of the collection items visible in the sidebar tree, in display order'),
});

const listCollections = async (peer: Peer): Promise<string[]> => {
  const { names } = await peer.extract(
    'List the names of the collection items visible in the sidebar tree.',
    collectionNames,
  );
  return names;
};

/**
 * Open a tree item's hover-revealed actions menu and click one of its options.
 */
const itemAction = async (peer: Peer, itemDescription: string, option: string): Promise<void> => {
  await peer.act(`Hover over ${itemDescription} in the sidebar tree`);
  await peer.act(`Click the "More actions" button on ${itemDescription}`);
  await peer.act(`Click the "${option}" option in the open menu`);
};

const renameItem = async (peer: Peer, itemDescription: string, newName: string): Promise<void> => {
  await itemAction(peer, itemDescription, 'Rename collection');
  await peer.act('Replace the text in the rename input with %name%', { variables: { name: newName } });
  await peer.page.keyPress('Enter');
  await peer.page.waitForTimeout(500);
};

describe('Collection tests', () => {
  let host: Peer;

  beforeEach(async () => {
    host = await createPeer();
    await createSpace(host);
  });

  afterEach(async () => {
    await host.close();
  });

  test('create collection', async () => {
    await createObject(host, 'Collection');
    await expandCollections(host);
    expect(await listCollections(host)).toContain('New collection');
  });

  test('re-order collections', async () => {
    await createObject(host, 'Collection');
    await createObject(host, 'Collection');
    await expandCollections(host);
    await renameItem(host, 'the first tree item named "New collection"', 'Collection 1');
    await renameItem(host, 'the tree item named "New collection"', 'Collection 2');

    // Items are 32px tall; drop just above the first item to re-order.
    await dragBetween(host, 'the sidebar tree item named "Collection 2"', 'the sidebar tree item named "Collection 1"', {
      x: 0,
      y: -15,
    });
    await host.page.waitForTimeout(1_000);

    const names = await listCollections(host);
    expect(names.indexOf('Collection 2')).toBeGreaterThanOrEqual(0);
    expect(names.indexOf('Collection 2')).toBeLessThan(names.indexOf('Collection 1'));
  });

  test('drag object into collection', async () => {
    await createObject(host, 'Collection');
    await createObject(host, 'Collection');
    await expandCollections(host);
    await renameItem(host, 'the first tree item named "New collection"', 'Collection 1');
    await renameItem(host, 'the tree item named "New collection"', 'Collection 2');

    await dragBetween(host, 'the sidebar tree item named "Collection 1"', 'the sidebar tree item named "Collection 2"');
    await host.page.waitForTimeout(1_000);

    // Nested under the (collapsed) Collection 2, Collection 1 leaves the top level…
    const topLevel = await listCollections(host);
    expect(topLevel).toContain('Collection 2');
    expect(topLevel).not.toContain('Collection 1');

    // …and reappears as a child when Collection 2 is expanded.
    await host.act('Click the expand/collapse toggle of the tree item named "Collection 2"');
    await host.page.waitForTimeout(500);
    const expanded = await listCollections(host);
    expect(expanded).toContain('Collection 1');
    expect(expanded).toContain('Collection 2');
  });

  test('delete a collection', async () => {
    await createObject(host, 'Collection');
    await expandCollections(host);
    // Create an item inside the collection via its own actions menu.
    await itemAction(host, 'the tree item named "New collection"', 'Add to collection');
    await host.act('Click the "Collection" option in the list of item types that opened');
    await host.page.waitForTimeout(1_500);
    const { dialogOpen } = await host.extract(
      'Is a modal dialog with a "Save" button currently open?',
      z.object({ dialogOpen: z.boolean() }),
    );
    if (dialogOpen) {
      await host.act('Click the "Save" button in the open dialog');
      await host.page.waitForTimeout(1_000);
    }
    expect(await listCollections(host)).toContain('New collection');

    // Deleting the containing collection removes it and its nested item.
    await itemAction(host, 'the first tree item named "New collection"', 'Delete collection');
    await host.page.waitForTimeout(1_000);
    expect(await listCollections(host)).not.toContain('New collection');
  });

  test('deletion undo restores collection', async () => {
    await createObject(host, 'Collection');
    await expandCollections(host);
    expect(await listCollections(host)).toContain('New collection');

    await itemAction(host, 'the tree item named "New collection"', 'Delete collection');
    // The toast auto-dismisses within seconds — undo immediately; deletion itself is
    // covered by the 'delete a collection' test.
    await host.act('Click the undo action button in the toast notification');
    await host.page.waitForTimeout(1_000);
    expect(await listCollections(host)).toContain('New collection');
  });
});
