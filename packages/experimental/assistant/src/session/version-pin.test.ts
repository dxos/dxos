import { Expando } from '@dxos/echo-schema';
import { live, makeRef } from '@dxos/live-object';
import { VersionPin } from './version-pin';
import { describe, expect, test } from 'vitest';
import { Option, pipe, Schema } from 'effect';
import { invariant } from '@dxos/invariant';

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
