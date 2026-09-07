//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { describe, expect, test } from 'vitest';

import { DXN } from '@dxos/keys';

import * as Obj from '../../../Obj';
import { EchoObjectSchema } from '../../Entity';

const Sheet = Schema.Struct({
  rec: Schema.optional(Schema.Struct({ list: Schema.optional(Schema.mutable(Schema.Array(Schema.String))) })),
  matrix: Schema.optional(Schema.mutable(Schema.Array(Schema.mutable(Schema.Array(Schema.Number))))),
  rows: Schema.optional(Schema.mutable(Schema.Array(Schema.Any))),
}).pipe(EchoObjectSchema(DXN.make('com.example.type.sheet', '0.1.0')));

const expectGated = (label: string, mutate: () => void) => {
  let message: string | undefined;
  try {
    mutate();
  } catch (err: any) {
    message = err.message;
  }
  expect(message, `${label} should be rejected outside Obj.update()`).to.include('Obj.update');
};

/**
 * The read-only gate reads its key off the target's prototype, so an array left as a plain `Array`
 * anywhere in the tree would be ungated — mutable outside `Obj.update()` and notifying nobody.
 * Assignment therefore reactifies its whole subtree, as construction does; these pin that.
 */
describe('nested array mutations are gated at every depth', () => {
  test('array under an assigned record', () => {
    const obj: any = Obj.make(Sheet, {});
    Obj.update(obj, (obj: any) => {
      obj.rec = { list: ['x'] };
    });

    expectGated('rec.list.push()', () => obj.rec.list.push('b'));
    expectGated('rec.list[0] =', () => (obj.rec.list[0] = 'z'));
    expect([...obj.rec.list]).to.deep.eq(['x']);
  });

  test('array nested inside an assigned array', () => {
    const obj: any = Obj.make(Sheet, {});
    Obj.update(obj, (obj: any) => {
      obj.matrix = [[1, 2]];
    });

    expectGated('matrix[0].push()', () => obj.matrix[0].push(3));
    expect([...obj.matrix[0]]).to.deep.eq([1, 2]);
  });

  test('array under a record inside an assigned array', () => {
    const obj: any = Obj.make(Sheet, {});
    Obj.update(obj, (obj: any) => {
      obj.rows = [{ cells: ['y'] }];
    });

    expectGated('rows[0].cells.push()', () => obj.rows[0].cells.push('z'));
    expect([...obj.rows[0].cells]).to.deep.eq(['y']);
  });

  test('array under a record passed to Obj.make', () => {
    const obj: any = Obj.make(Sheet, { rec: { list: ['x'] } });

    expectGated('rec.list.push()', () => obj.rec.list.push('b'));
  });

  test('mutation inside Obj.update() applies and notifies once', () => {
    const obj: any = Obj.make(Sheet, {});
    Obj.update(obj, (obj: any) => {
      obj.rec = { list: ['x'] };
    });

    let events = 0;
    Obj.subscribe(obj, () => events++);
    Obj.update(obj, (obj: any) => {
      obj.rec.list.push('b');
    });

    expect([...obj.rec.list]).to.deep.eq(['x', 'b']);
    expect(events).to.eq(1);
  });
});
