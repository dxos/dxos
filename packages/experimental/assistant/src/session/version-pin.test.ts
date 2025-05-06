//
// Copyright 2025 DXOS.org
//

import { pipe, Schema } from 'effect';
import { describe, expect, test } from 'vitest';

import { Expando } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { live } from '@dxos/live-object';

import { VersionPin } from './version-pin';

describe('VersionPin', () => {
  test('serialization', () => {
    const obj = live(Expando, {
      name: 'John Doe',
    });
    const block = VersionPin.createBlock(VersionPin.make({ objectId: obj.id, version: obj.version }));
    invariant(block.type === 'json' && block.disposition === VersionPin.DISPOSITION);
    const pin = pipe(JSON.parse(block.json), VersionPin.pipe(Schema.decodeSync));
    expect(pin).toBeDefined();
    expect(pin?.objectId).toBe(obj.id);
    expect(pin?.version).toBe(obj.version);
  });
});
