//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { describe, expect, test } from 'vitest';

import { DXN } from '@dxos/keys';

import * as Lens from '../../Lens.ts';
import * as Obj from '../../Obj.ts';
import * as Ref from '../../Ref.ts';
import * as Type from '../../Type.ts';

const TYPENAME = 'org.dxos.test.task';

const TaskV1 = Type.makeObject(DXN.make(TYPENAME, '0.1.0'))(
  Schema.Struct({ title: Schema.String, notes: Schema.optional(Schema.String) }),
);

const TaskV2 = Type.makeObject(DXN.make(TYPENAME, '0.2.0'))(
  Schema.Struct({ name: Schema.String, notes: Schema.optional(Schema.String), done: Schema.Boolean }),
);

const TaskV3 = Type.makeObject(DXN.make(TYPENAME, '0.3.0'))(
  Schema.Struct({ name: Schema.String, done: Schema.Boolean }),
);

const v1v2 = Lens.make(TaskV1, TaskV2, { name: 'title' }, { defaults: { done: false } });
const v2v3 = Lens.make(TaskV2, TaskV3, {}, { defaults: { notes: '' } });

describe('lenses between versions', () => {
  test('forward and backward are inverse for data both versions can hold', () => {
    const step = Lens.versionEdge(v1v2);
    const v1 = { title: 'Plan', notes: 'soon' };
    expect(step.forward(v1)).toEqual({ name: 'Plan', notes: 'soon', done: false });
    expect(step.backward(step.forward(v1))).toEqual(v1);
    expect(Lens.versionEdge(v2v3).backward({ name: 'Plan', done: true })).toEqual({
      name: 'Plan',
      done: true,
      notes: '',
    });
  });

  test('a property only the target has keeps a value the object already has', () => {
    expect(Lens.versionEdge(v1v2).forward({ title: 'Plan', done: true })).toEqual({ name: 'Plan', done: true });
  });

  test('a default comes from the schema unless the lens declares one', () => {
    const Defaulted = Type.makeObject(DXN.make(TYPENAME, '0.2.0'))(
      Schema.Struct({ name: Schema.String, tags: Schema.Array(Schema.String).annotate({ default: [] }) }),
    );
    const step = Lens.versionEdge(Lens.make(TaskV1, Defaulted, { name: 'title' }));
    const one = step.forward({ title: 'Plan' });
    const two = step.forward({ title: 'Plan' });
    expect(one).toEqual({ name: 'Plan', tags: [] });
    // Defaults are copied per result, so two objects never share one array.
    expect(one.tags).not.toBe(two.tags);
  });

  test('a path composes lenses in either direction', () => {
    const lenses = [v2v3, v1v2];
    const edges = lenses.map(Lens.versionEdge);
    const up = Lens.versionPath(edges, TYPENAME, '0.1.0', '0.3.0');
    const down = Lens.versionPath(edges, TYPENAME, '0.3.0', '0.1.0');
    expect(up?.digests).toEqual([v1v2.digest, v2v3.digest]);
    // A hop against a lens's direction is identified by the same digest.
    expect(down?.digests).toEqual([v2v3.digest, v1v2.digest]);
    expect(up?.apply({ title: 'Plan', notes: 'soon' })).toEqual({ name: 'Plan', done: false });
    expect(down?.apply({ name: 'Plan', done: true })).toEqual({ title: 'Plan', notes: '' });
    expect(Lens.versionPath([Lens.versionEdge(v1v2)], TYPENAME, '0.1.0', '0.3.0')).toBeUndefined();
    expect(Lens.versionsOf(edges, TYPENAME)).toEqual(['0.1.0', '0.2.0', '0.3.0']);
  });

  test('a version lens connects an older version of one type to a newer one', () => {
    const Other = Type.makeObject(DXN.make('org.dxos.test.other', '0.2.0'))(Schema.Struct({ title: Schema.String }));
    expect(Lens.isVersionLens(v1v2)).toBe(true);
    expect(Lens.isVersionLens(Lens.make(TaskV1, Other))).toBe(false);
    expect(Lens.isVersionLens(Lens.make(TaskV2, TaskV1, { title: 'name' }))).toBe(false);
  });

  test('an entry that runs code does not translate version documents', () => {
    const converted = Lens.make(
      TaskV1,
      TaskV2,
      {
        name: { from: ['title'], get: ({ title }) => title.toUpperCase(), put: (name: string) => ({ title: name }) },
      },
      { defaults: { done: false } },
    );
    expect(Lens.isVersionLens(converted)).toBe(true);
    expect(() => Lens.versionEdge(converted)).toThrow(/"name" runs code/);
  });

  test('a required property only one side has needs a default', () => {
    expect(() => Lens.versionEdge(Lens.make(TaskV1, TaskV2, { name: 'title' }))).toThrow(
      /"done" is required in .* and has no default/,
    );
  });

  test('the digest follows what the lens does, not how it was declared', () => {
    const again = Lens.make(TaskV1, TaskV2, { name: 'title' }, { defaults: { done: false } });
    expect(again.digest).toBe(v1v2.digest);
    expect(again.name).toBe(v1v2.name);
    expect(Lens.make(TaskV1, TaskV2, { name: 'title' }, { defaults: { done: true } }).digest).not.toBe(v1v2.digest);

    // The same version, changed without a version bump, maps by name differently: a different digest.
    const Drifted = Type.makeObject(DXN.make(TYPENAME, '0.2.0'))(
      Schema.Struct({ name: Schema.String, done: Schema.Boolean }),
    );
    expect(Lens.make(TaskV1, Drifted, { name: 'title' }, { defaults: { done: false } }).digest).not.toBe(v1v2.digest);
  });

  test('a stored lens runs the same step without the schemas it connects', () => {
    const edge = Lens.storedVersionEdge(Lens.toStored(v1v2));
    const fromCode = Lens.versionEdge(v1v2);
    expect(edge?.digest).toBe(v1v2.digest);
    expect(edge?.forward({ title: 'Plan', notes: 'soon' })).toEqual(fromCode.forward({ title: 'Plan', notes: 'soon' }));
    expect(edge?.backward({ name: 'Plan', done: true, extra: 1 })).toEqual(
      fromCode.backward({ name: 'Plan', done: true, extra: 1 }),
    );
  });

  describe('nested values', () => {
    const OrderV1 = Type.makeObject(DXN.make('org.dxos.test.order', '0.1.0'))(
      Schema.Struct({
        address: Schema.Struct({ street: Schema.String, city: Schema.String }),
        items: Schema.Array(Schema.Struct({ sku: Schema.String, qty: Schema.Number })),
        notes: Schema.Record(Schema.String, Schema.Struct({ body: Schema.String })),
      }),
    );
    const OrderV2 = Type.makeObject(DXN.make('org.dxos.test.order', '0.2.0'))(
      Schema.Struct({
        address: Schema.Struct({ line1: Schema.String, city: Schema.String }),
        items: Schema.Array(Schema.Struct({ sku: Schema.String, quantity: Schema.Number, gift: Schema.Boolean })),
        notes: Schema.Record(Schema.String, Schema.Struct({ text: Schema.String })),
      }),
    );
    const lens = Lens.make(OrderV1, OrderV2, {
      address: Lens.within('address', { line1: 'street' }),
      items: Lens.each('items', { quantity: 'qty' }, { gift: false }),
      notes: Lens.values('notes', { text: 'body' }),
    });
    const v1 = {
      address: { street: '1 Main', city: 'Springfield' },
      items: [
        { sku: 'a', qty: 1 },
        { sku: 'b', qty: 2 },
      ],
      notes: { first: { body: 'hello' } },
    };
    const v2 = {
      address: { line1: '1 Main', city: 'Springfield' },
      items: [
        { sku: 'a', quantity: 1, gift: false },
        { sku: 'b', quantity: 2, gift: false },
      ],
      notes: { first: { text: 'hello' } },
    };

    test('a rename inside a struct, each list element and each record value runs both ways', () => {
      const edge = Lens.versionEdge(lens);
      expect(edge.forward(v1)).toEqual(v2);
      expect(edge.backward(v2)).toEqual(v1);
    });

    test('a stored nested lens runs the same step, and rehydrates to the same digest', () => {
      const stored = Lens.toStored(lens);
      expect(Lens.storedVersionEdge(stored)?.forward(v1)).toEqual(v2);
      expect(Lens.fromStored(stored, OrderV1, OrderV2).digest).toBe(lens.digest);
    });

    test('a view reads and writes through the nested mapping', () => {
      const order = Obj.make(OrderV1, v1);
      expect(Lens.get(order, lens)).toMatchObject(v2);
      Lens.put(order, lens, { address: { line1: '2 Side', city: 'Springfield' } });
      expect({ ...order.address }).toEqual({ street: '2 Side', city: 'Springfield' });
    });

    test('a required property one side of a nested struct alone declares needs a default', () => {
      const missing = Lens.make(OrderV1, OrderV2, {
        address: Lens.within('address', { line1: 'street' }),
        items: Lens.each('items', { quantity: 'qty' }),
        notes: Lens.values('notes', { text: 'body' }),
      });
      expect(() => Lens.versionEdge(missing)).toThrow(/"items\[\]\.gift" is required in the newer version/);
    });
  });

  describe('one-way transforms', () => {
    const PersonV1 = Type.makeObject(DXN.make('org.dxos.test.person', '0.1.0'))(
      Schema.Struct({ first: Schema.String, last: Schema.String, status: Schema.String }),
    );
    const PersonV2 = Type.makeObject(DXN.make('org.dxos.test.person', '0.2.0'))(
      Schema.Struct({ fullName: Schema.String, initial: Schema.String, active: Schema.Boolean, kind: Schema.String }),
    );
    const lens = Lens.make(
      PersonV1,
      PersonV2,
      {
        fullName: Lens.concat(['first', 'last'], ' '),
        initial: Lens.part('first', '', 0),
        active: Lens.mapValue('status', { open: true, closed: false }, false),
        kind: Lens.constant('person'),
      },
      { defaults: { first: '', last: '', status: 'open' } },
    );

    test('forward computes the derived properties; backward leaves the older properties alone', () => {
      const edge = Lens.versionEdge(lens);
      expect(edge.forward({ first: 'Ada', last: 'Lovelace', status: 'closed' })).toEqual({
        fullName: 'Ada Lovelace',
        initial: 'A',
        active: false,
        kind: 'person',
      });
      // Going back, nothing is derived: the older version keeps what it holds, or starts at the defaults.
      expect(edge.backward({ fullName: 'Grace Hopper', initial: 'G', active: true, kind: 'person' })).toEqual({
        first: '',
        last: '',
        status: 'open',
      });
    });

    test('a required input of a one-way transform needs a default for objects created at the newer version', () => {
      const missing = Lens.make(PersonV1, PersonV2, {
        fullName: Lens.concat(['first', 'last'], ' '),
        initial: Lens.part('first', '', 0),
        active: Lens.mapValue('status', { open: true }, false),
        kind: Lens.constant('person'),
      });
      expect(() => Lens.versionEdge(missing)).toThrow(/"first" is required in the older version and has no default/);
    });

    test('one-way properties are read-only in a view, and the stored lens runs the same step', () => {
      const person = Obj.make(PersonV1, { first: 'Ada', last: 'Lovelace', status: 'open' });
      expect(Lens.get(person, lens)).toMatchObject({ fullName: 'Ada Lovelace', active: true });
      expect(() => Lens.put(person, lens, { fullName: 'X' })).toThrow(/read-only/);
      const stored = Lens.storedVersionEdge(Lens.toStored(lens));
      expect(stored?.forward({ first: 'Ada', last: 'Lovelace', status: 'open' })).toEqual(
        Lens.versionEdge(lens).forward({ first: 'Ada', last: 'Lovelace', status: 'open' }),
      );
    });
  });

  describe('extracted structs', () => {
    const Address = Type.makeObject(DXN.make('org.dxos.test.address', '0.1.0'))(
      Schema.Struct({ line1: Schema.String, city: Schema.String }),
    );
    const PersonV1 = Type.makeObject(DXN.make('org.dxos.test.person', '0.1.0'))(
      Schema.Struct({ name: Schema.String, address: Schema.Struct({ street: Schema.String, city: Schema.String }) }),
    );
    const PersonV2 = Type.makeObject(DXN.make('org.dxos.test.person', '0.2.0'))(
      Schema.Struct({ name: Schema.String, address: Ref.Ref(Address) }),
    );
    const lens = Lens.make(
      PersonV1,
      PersonV2,
      { address: Lens.extract('address', Address, { line1: 'street' }) },
      { defaults: { address: { street: '', city: '' } } },
    );

    test('the struct leaves the newer version and maps into the extracted object both ways', () => {
      const edge = Lens.versionEdge(lens);
      expect(edge.forward({ name: 'Ada', address: { street: '1 Main', city: 'London' } })).toEqual({ name: 'Ada' });
      // Going back, the reference is dropped and the struct starts at its default until the object reaches it.
      expect(edge.backward({ name: 'Ada', address: { '/': 'echo:@:01J00000000000000000000000' } })).toEqual({
        name: 'Ada',
        address: { street: '', city: '' },
      });
      const [link] = edge.links;
      expect(link).toMatchObject({ property: 'address', from: 'address', child: Type.getURI(Address) });
      expect(link.forward({ street: '1 Main', city: 'London' })).toEqual({ line1: '1 Main', city: 'London' });
      expect(link.backward({ line1: '1 Main', city: 'London' })).toEqual({ street: '1 Main', city: 'London' });
    });

    test('a stored lens runs the same link, and rehydrates to the same digest', () => {
      const stored = Lens.toStored(lens);
      const [link] = Lens.storedVersionEdge(stored)?.links ?? [];
      expect(link?.forward({ street: '1 Main', city: 'London' })).toEqual({ line1: '1 Main', city: 'London' });
      const resolve = (uri: string) => (uri === Type.getURI(Address) ? Address : undefined);
      expect(Lens.fromStored(stored, PersonV1, PersonV2, resolve).digest).toBe(lens.digest);
    });

    test('the extracted struct needs a default for objects created at the newer version', () => {
      const missing = Lens.make(PersonV1, PersonV2, { address: Lens.extract('address', Address, { line1: 'street' }) });
      expect(() => Lens.versionEdge(missing)).toThrow(/"address" is required in the older version and has no default/);
    });

    test('a required property only the extracted object has needs a default', () => {
      const Located = Type.makeObject(DXN.make('org.dxos.test.address', '0.1.0'))(
        Schema.Struct({ line1: Schema.String, city: Schema.String, country: Schema.String }),
      );
      const Target = Type.makeObject(DXN.make('org.dxos.test.person', '0.2.0'))(
        Schema.Struct({ name: Schema.String, address: Ref.Ref(Located) }),
      );
      const missing = Lens.make(
        PersonV1,
        Target,
        { address: Lens.extract('address', Located, { line1: 'street' }) },
        { defaults: { address: { street: '', city: '' } } },
      );
      expect(() => Lens.versionEdge(missing)).toThrow(/"address->country" is required in the newer version/);
    });

    test('a view reads the reference as unset and rejects writing it', () => {
      const person = Obj.make(PersonV1, { name: 'Ada', address: { street: '1 Main', city: 'London' } });
      expect(Lens.get(person, lens).address).toBeUndefined();
      expect(() => Lens.put(person, lens, { address: undefined })).toThrow(/read-only/);
    });

    test('each element of a list of structs maps into an object of its own', () => {
      const Item = Type.makeObject(DXN.make('org.dxos.test.item', '0.1.0'))(
        Schema.Struct({ sku: Schema.String, quantity: Schema.Number }),
      );
      const OrderV1 = Type.makeObject(DXN.make('org.dxos.test.order', '0.1.0'))(
        Schema.Struct({ items: Schema.Array(Schema.Struct({ sku: Schema.String, qty: Schema.Number })) }),
      );
      const OrderV2 = Type.makeObject(DXN.make('org.dxos.test.order', '0.2.0'))(
        Schema.Struct({ items: Schema.Array(Ref.Ref(Item)) }),
      );
      const each = Lens.make(
        OrderV1,
        OrderV2,
        { items: Lens.extractEach('items', Item, { quantity: 'qty' }) },
        { defaults: { items: [] } },
      );
      const edge = Lens.versionEdge(each);
      expect(edge.forward({ items: [{ sku: 'a', qty: 1 }] })).toEqual({});
      expect(edge.backward({ items: [] })).toEqual({ items: [] });
      const [link] = edge.links;
      expect(link).toMatchObject({ property: 'items', from: 'items', shape: 'each', child: Type.getURI(Item) });
      expect(link.forward({ sku: 'a', qty: 1 })).toEqual({ sku: 'a', quantity: 1 });
      expect(Lens.storedVersionEdge(Lens.toStored(each))?.links[0]?.shape).toBe('each');
      expect(() => Lens.make(OrderV1, OrderV2, { items: Lens.extract('items', Item, { quantity: 'qty' }) })).toThrow(
        /"items" is not a struct to extract/,
      );
      expect(() =>
        Lens.make(PersonV1, PersonV2, { address: Lens.extractEach('address', Address, { line1: 'street' }) }),
      ).toThrow(/"address" is not a list of structs to extract/);
    });

    test('an absorbed reference becomes a struct of the newer version, derived from the object', () => {
      const RefV1 = Type.makeObject(DXN.make('org.dxos.test.contact', '0.1.0'))(
        Schema.Struct({ name: Schema.String, address: Schema.optional(Ref.Ref(Address)) }),
      );
      const StructV2 = Type.makeObject(DXN.make('org.dxos.test.contact', '0.2.0'))(
        Schema.Struct({ name: Schema.String, address: Schema.Struct({ street: Schema.String, city: Schema.String }) }),
      );
      const absorb = Lens.make(RefV1, StructV2, { address: Lens.absorb('address', Address, { street: 'line1' }) });
      const edge = Lens.versionEdge(absorb);
      expect(edge.forward({ name: 'Ada', address: { '/': 'echo:@:01J00000000000000000000000' } })).toEqual({
        name: 'Ada',
      });
      expect(edge.backward({ name: 'Ada', address: { street: '1 Main', city: 'London' } })).toEqual({ name: 'Ada' });
      const [link] = edge.links;
      expect(link).toMatchObject({
        property: 'address',
        from: 'address',
        shape: 'absorb',
        child: Type.getURI(Address),
      });
      expect(link.forward({ line1: '1 Main', city: 'London' })).toEqual({ street: '1 Main', city: 'London' });
      expect(link.backward({ street: '1 Main', city: 'London' })).toEqual({ line1: '1 Main', city: 'London' });
      const stored = Lens.toStored(absorb);
      expect(Lens.storedVersionEdge(stored)?.links[0]?.shape).toBe('absorb');
      const resolve = (uri: string) => (uri === Type.getURI(Address) ? Address : undefined);
      expect(Lens.fromStored(stored, RefV1, StructV2, resolve).digest).toBe(absorb.digest);
      expect(() => Lens.make(StructV2, RefV1, { address: Lens.absorb('address', Address, {}) })).toThrow(
        /"address" is not a reference to org.dxos.test.address to absorb/,
      );
    });

    test('the property must reference the extracted type', () => {
      expect(() => Lens.make(PersonV1, PersonV2, { address: Lens.extract('address', TaskV1, {}) })).toThrow(
        /is not a reference to org.dxos.test.task/,
      );
    });
  });

  test('versions compare numerically', () => {
    expect(Lens.compareVersions('0.10.0', '0.9.0')).toBeGreaterThan(0);
    expect(Lens.compareVersions('1.0.0', '1.0.0')).toBe(0);
  });
});
