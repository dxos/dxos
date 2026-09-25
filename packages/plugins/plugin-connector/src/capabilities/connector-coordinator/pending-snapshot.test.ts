//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { DXN, EID, Obj, Ref } from '@dxos/echo';
import { Expando } from '@dxos/schema';

/**
 * The snapshot persists a target as `Ref.uri`, and the redirect-recovery path turns that string back
 * into a ref. `Ref.uri` is an `echo:` EID, so it must be read with `EID.tryParse` — reading it as a
 * `dxn:` DXN always yielded `undefined`, and the resulting broken ref failed inside
 * `createSingleCursor`, which swallows its errors: the mailbox stayed unbound and its toolbar kept
 * offering Connect instead of Sync.
 */
describe('pending snapshot target uri', () => {
  test('Ref.uri round-trips through EID.tryParse', () => {
    const object = Obj.make(Expando.Expando, { name: 'Inbox' });
    const uri = Ref.make(object).uri;

    const parsed = EID.tryParse(uri);
    expect(parsed).toBe(uri);
  });

  test('Ref.uri is an echo EID, never a DXN', () => {
    const uri = Ref.make(Obj.make(Expando.Expando, { name: 'Inbox' })).uri;

    expect(uri.startsWith('echo:')).toBe(true);
    expect(DXN.tryMake(uri)).toBeUndefined();
  });
});
