//
// Copyright 2025 DXOS.org
//

import { next as A } from '@automerge/automerge';
import * as Schema from 'effect/Schema';
import { afterEach, describe, expect, test } from 'vitest';

import { TabHarness, canon, seeded } from '@dxos/automerge-proxy/testing';
import { DXN, Obj, Type } from '@dxos/echo';
import { invariant } from '@dxos/invariant';

import * as Doc from './Doc.ts';
import { AbstractStoreAdapter, type Batch } from './store-adapter.ts';

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

describe('AbstractStoreAdapter over tab documents', () => {
  type Board = { elements: Record<string, Element> };

  /** The adapter as a store drives it: a user's edit lands in the store, then goes to the document. */
  class EditingAdapter extends TestAdapter {
    edit(batch: Batch<Element>): void {
      [...(batch.added ?? []), ...(batch.updated ?? [])].forEach((element) => this.store.set(element.id, element));
      (batch.deleted ?? []).forEach((id) => this.store.delete(id));
      this.write(batch);
    }
  }

  let harness: TabHarness<Board> | undefined;

  afterEach(async () => {
    await harness?.close();
    harness = undefined;
  });

  test.each([1, 2, 3])("two tabs' stores stay in step through the unmodified adapter (seed %i)", async (seed) => {
    harness = new TabHarness<Board>({ seed });
    await harness.open();
    harness.store.put('board', A.from<Board>({ elements: {} }));
    const repos = [await harness.tab(), await harness.tab()];
    const handles = repos.map((repo) => repo.find('board'));
    await Promise.all(handles.map((handle) => handle.whenReady()));
    const adapters = handles.map((handle) => {
      const adapter = new EditingAdapter();
      adapter.open({ handle, path: ['elements'] });
      return adapter;
    });

    const { rand, pick } = seeded(seed);
    for (let step = 0; step < 60; step++) {
      const adapter = adapters[pick(adapters.length)];
      const ids = [...adapter.store.keys()];
      const roll = rand();
      if (roll < 0.4 || ids.length === 0) {
        adapter.edit({ added: [{ id: `element-${step}`, value: `${step}` }] });
      } else if (roll < 0.8) {
        const element = adapter.store.get(ids[pick(ids.length)]);
        invariant(element);
        adapter.edit({ updated: [{ ...element, value: `${element.value}'` }] });
      } else {
        adapter.edit({ deleted: [ids[pick(ids.length)]] });
      }
      if (rand() < 0.4) {
        // A macrotask turn, so the transports deliver between edits.
        await new Promise((resolve) => setTimeout(resolve, pick(4)));
      }
    }
    await Promise.all(repos.map((repo) => repo.flush()));
    const current = harness;
    const stored = () => A.getHeads(current.store.get<Board>('board')).join();
    await expect
      .poll(() => handles.every((handle) => handle.heads.join() === stored()), { timeout: 10_000 })
      .toBe(true);

    const expected = canon(A.toJS(harness.store.get<Board>('board')).elements);
    for (const adapter of adapters) {
      expect(canon(Object.fromEntries([...adapter.store].sort()))).toBe(expected);
    }
  });
});
