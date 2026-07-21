//
// Copyright 2026 DXOS.org
//

import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { z } from 'zod';

import { type Peer, createObject, createPeer, createSpace } from './composer';

const tableShape = z.object({
  dataRows: z.number().describe('the number of data rows in the table (excluding the header row)'),
  columns: z.number().describe('the number of columns in the table'),
});

const shape = async (peer: Peer) => peer.extract('Describe the table shape.', tableShape);

// TODO(wittjosiah): Fix table tests.
describe.skip('Table tests', () => {
  let host: Peer;

  beforeEach(async () => {
    host = await createPeer();
    await createSpace(host);
    await createObject(host, 'Table');
    await host.act('Type "Test table" into the table name input in the setup form');
    await host.act('Click the continue button in the table setup form');
    await host.page.waitForTimeout(1_000);
  });

  afterEach(async () => {
    await host.close();
  });

  test('create', async () => {
    expect((await shape(host)).dataRows).toBe(1);
  });

  test('can add rows', async () => {
    await host.act('Click the first cell of the last table row and type "test"');
    await host.page.keyPress('Enter');
    await host.page.waitForTimeout(1_000);
    expect((await shape(host)).dataRows).toBe(2);
  });

  test('can delete rows', async () => {
    await host.act('Click the first cell of the last table row and type "test"');
    await host.page.keyPress('Enter');
    await host.page.waitForTimeout(1_000);
    expect((await shape(host)).dataRows).toBe(2);

    await host.act('Click the delete-row button of the first table row');
    await host.page.waitForTimeout(1_000);
    expect((await shape(host)).dataRows).toBe(1);
  });

  test('can add columns', async () => {
    await host.act('Click the add-column button in the table header');
    await host.page.waitForTimeout(1_000);
    expect((await shape(host)).columns).toBe(3);
  });

  test('can delete columns', async () => {
    await host.act('Click the add-column button in the table header');
    await host.page.waitForTimeout(1_000);
    expect((await shape(host)).columns).toBe(3);

    await host.act('Click the column menu button of the last table column');
    await host.act('Click the option to open the column settings');
    await host.act('Click the delete button in the column settings');
    await host.page.waitForTimeout(1_000);
    expect((await shape(host)).columns).toBe(2);
  });

  test('can rename columns', async () => {
    await host.act('Click the column menu button of the last table column');
    await host.act('Click the option to open the column settings');
    await host.act('Replace the text in the column label input with "Renamed"');
    await host.act('Click the save button in the column settings');
    await host.page.waitForTimeout(1_000);

    const labels = await host.extract(
      'List the table column header labels in order.',
      z.object({ labels: z.array(z.string()) }),
    );
    expect(labels.labels).toContain('Renamed');
  });
});
