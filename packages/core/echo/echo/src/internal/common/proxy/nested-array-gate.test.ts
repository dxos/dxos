//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { describe, expect, test } from 'vitest';

import { DXN } from '@dxos/keys';

import * as Obj from '../../../Obj.ts';
import { EchoObjectSchema } from '../../Entity/index.ts';

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

/**
 * Writability belongs to the reference, not to the callback's dynamic extent. `Obj.update` hands the
 * callback a mutable view; the object named outside stays read-only for the whole of it.
 */
describe('the change context is reference-based, not ambient', () => {
  test('the outer reference stays read-only inside the callback', () => {
    const obj: any = Obj.make(Sheet, {});

    // Reached a frame deeper, which is also the shape the lint rule cannot see: it reports a mutation
    // written inside the callback, so only the runtime catches this one.
    const writeThrough = (target: any) => {
      target.rows = [];
    };

    // Aliased because the parameter shadows `obj` by convention, and the parameter is the mutable view.
    const readOnly = obj;

    expect(() =>
      Obj.update(obj, (obj: any) => {
        void obj;
        writeThrough(readOnly);
      }),
    ).to.throw(/Obj\.update/);
  });

  test('navigation from the parameter is mutable all the way down', () => {
    const obj: any = Obj.make(Sheet, { rec: { list: ['x'] } });

    Obj.update(obj, (obj: any) => {
      obj.rec.list.push('b');
      obj.rec.list[0] = 'z';
    });

    expect([...obj.rec.list]).to.deep.eq(['z', 'b']);
  });

  test('a mutable view is never stored in the graph', () => {
    const obj: any = Obj.make(Sheet, { rec: { list: ['x'] } });
    const before = obj.rec;

    Obj.update(obj, (obj: any) => {
      obj.rows = [obj.rec];
    });

    // What landed in the document is the canonical reference, not the callback-scoped view.
    expect(obj.rows[0]).to.eq(before);
  });
});
