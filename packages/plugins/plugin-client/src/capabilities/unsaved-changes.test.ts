//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { type UnsavedChangesClient, saveUnsavedChanges } from './unsaved-changes.ts';

/** A client with one space whose flush settles as `flush` does, saving its changes when it resolves. */
const createClient = (flush: () => Promise<void>): UnsavedChangesClient => {
  let unsaved = true;
  const db = {
    hasUnsavedChanges: () => unsaved,
    flush: async () => {
      await flush();
      unsaved = false;
    },
  };
  return { spaces: { get: () => [{ db }] } };
};

describe('saveUnsavedChanges', () => {
  test('a flush that lands leaves nothing unsaved', async ({ expect }) => {
    expect(await saveUnsavedChanges(createClient(async () => {}))).toBe(true);
  });

  test('a flush the worker never answers is given up on and reported unsaved', async ({ expect }) => {
    expect(
      await saveUnsavedChanges(
        createClient(() => new Promise(() => {})),
        10,
      ),
    ).toBe(false);
  });
});
