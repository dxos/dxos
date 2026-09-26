//
// Copyright 2026 DXOS.org
//

import * as A from '@automerge/automerge';
import { describe, expect, test, vi } from 'vitest';

vi.mock('@automerge/automerge', async (importOriginal) =>
  (await import('./mocks.ts')).automergeFactory(importOriginal),
);
vi.mock('@dxos/automerge-proxy/Automerge', async (importOriginal) =>
  (await import('./mocks.ts')).proxyNamespaceFactory(importOriginal),
);

// eslint-disable-next-line import/first
import { AbstractStoreAdapter, type Batch } from '@dxos/echo-doc';
// eslint-disable-next-line import/first
import { invariant } from '@dxos/invariant';

// eslint-disable-next-line import/first
import { SpikeHost } from './host.ts';
// eslint-disable-next-line import/first
import { leaks } from './namespace.ts';
// eslint-disable-next-line import/first
import { Network } from './network.ts';
// eslint-disable-next-line import/first
import { canon, seeded } from './testing.ts';

type Shape = { id: string; x: number; label: string; points?: number[] };

type Board = { elements: Record<string, Shape> };

/** A store like tldraw's or excalidraw's: records keyed by id, notified of document changes. */
class Store extends AbstractStoreAdapter<Shape> {
  readonly shapes = new Map<string, Shape>();
  updates = 0;

  getElements(): readonly Shape[] {
    return [...this.shapes.values()];
  }

  protected onUpdate(batch: Batch<Shape>): void {
    this.updates++;
    batch.updated?.forEach((shape) => this.shapes.set(shape.id, shape));
    batch.deleted?.forEach((id) => this.shapes.delete(id));
  }

  /** What the store's own listener does on a user edit. */
  write(batch: Batch<Shape>): void {
    batch.added?.forEach((shape) => this.shapes.set(shape.id, shape));
    batch.updated?.forEach((shape) => this.shapes.set(shape.id, shape));
    batch.deleted?.forEach((id) => this.shapes.delete(id));
    this.updateDatabase(batch);
  }
}

describe('store adapters over tab documents', () => {
  test("two tabs' stores stay in step through the unmodified adapter", () => {
    for (const seed of [1, 2, 3]) {
      leaks.length = 0;
      const { rand, pick } = seeded(seed);
      const host = new SpikeHost();
      host.create('board', { elements: {} });
      const network = new Network(host);
      const tabs = [network.open<Board>('board'), network.open<Board>('board')];
      const stores = tabs.map((tab) => {
        const store = new Store();
        store.open({ handle: tab.handle, path: ['elements'] });
        return store;
      });

      for (let step = 0; step < 60; step++) {
        const store = stores[pick(stores.length)];
        const ids = [...store.shapes.keys()];
        const r = rand();
        if (r < 0.4 || ids.length === 0) {
          const id = `shape-${seed}-${step}`;
          store.write({ added: [{ id, x: pick(100), label: `s${step}`, points: [pick(9), pick(9)] }] });
        } else if (r < 0.8) {
          const shape = store.shapes.get(ids[pick(ids.length)]);
          invariant(shape);
          store.write({ updated: [{ ...shape, x: pick(100), label: `${shape.label}'` }] });
        } else {
          store.write({ deleted: [ids[pick(ids.length)]] });
        }
        if (rand() < 0.4) {
          network.deliver(1 + pick(network.pending + 1));
        }
      }
      network.settle();

      const expected = canon(A.toJS(A.load<Board>(A.save(host.doc('board')))).elements);
      for (const store of stores) {
        expect(canon(Object.fromEntries([...store.shapes].sort()))).toBe(expected);
      }
      expect(leaks).toEqual([]);
    }
  });
});
