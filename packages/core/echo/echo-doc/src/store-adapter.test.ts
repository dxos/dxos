//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';
import { describe, test } from 'vitest';

import { DXN, Obj, Type } from '@dxos/echo';

import * as Doc from './Doc';
import { AbstractStoreAdapter, type Batch } from './store-adapter';

const Canvas = Type.makeObject(DXN.make('com.example.type.canvas', '0.1.0'))(
  Schema.Struct({
    content: Schema.optional(Schema.Any),
  }),
);

type Element = { id: string; value: string };

// Reads/mutates the element map at the accessor's (namespaced) path.
const elementMap = (accessor: Doc.Accessor): Record<string, Element> => Doc.getValue<Record<string, Element>>(accessor);
const mutateMap = (accessor: Doc.Accessor, mutate: (map: Record<string, Element>) => void): void =>
  accessor.handle.change((doc: any) => {
    let map = doc;
    for (const key of accessor.path) {
      map = map[key];
    }
    mutate(map);
  });

// Minimal adapter that mirrors the document map into a local `Map`.
class TestAdapter extends AbstractStoreAdapter<Element> {
  readonly store = new Map<string, Element>();
  readonly updates: Batch<Element>[] = [];

  override getElements(): Element[] {
    return [...this.store.values()];
  }

  protected override onUpdate(batch: Batch<Element>): void {
    this.updates.push(batch);
    [...(batch.added ?? []), ...(batch.updated ?? [])].forEach((element) => this.store.set(element.id, element));
    (batch.deleted ?? []).forEach((id) => this.store.delete(id));
  }

  write(batch: Batch<Element>): void {
    this.updateDatabase(batch);
  }
}

describe('AbstractStoreAdapter', () => {
  test('seeds an empty document from the store', ({ expect }) => {
    const obj = Obj.make(Canvas, { content: {} });
    const accessor = Doc.createAccessor(obj, ['content']);

    const adapter = new TestAdapter();
    adapter.store.set('a', { id: 'a', value: '1' });
    const dispose = adapter.open(accessor);

    expect(elementMap(accessor).a).toEqual({ id: 'a', value: '1' });
    dispose();
  });

  test('hydrates the store from a populated document', ({ expect }) => {
    const obj = Obj.make(Canvas, { content: { a: { id: 'a', value: '1' } } });
    const accessor = Doc.createAccessor(obj, ['content']);

    const adapter = new TestAdapter();
    const dispose = adapter.open(accessor);

    expect(adapter.store.get('a')).toEqual({ id: 'a', value: '1' });
    dispose();
  });

  test('writes store changes to the document and reflects external changes back', ({ expect }) => {
    const obj = Obj.make(Canvas, { content: {} });
    const accessor = Doc.createAccessor(obj, ['content']);

    const adapter = new TestAdapter();
    const dispose = adapter.open(accessor);

    // store -> doc
    adapter.write({ added: [{ id: 'a', value: '1' }] });
    expect(elementMap(accessor).a).toEqual({ id: 'a', value: '1' });

    // doc -> store (external mutation)
    mutateMap(accessor, (map) => {
      map.b = { id: 'b', value: '2' };
    });
    expect(adapter.store.get('b')).toEqual({ id: 'b', value: '2' });

    // dispose stops propagation
    dispose();
    mutateMap(accessor, (map) => {
      map.c = { id: 'c', value: '3' };
    });
    expect(adapter.store.has('c')).toBe(false);
  });
});
