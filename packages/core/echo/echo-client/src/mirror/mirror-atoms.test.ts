//
// Copyright 2026 DXOS.org
//

import type * as Atom from 'effect/unstable/reactivity/Atom';
import * as AtomRegistry from 'effect/unstable/reactivity/AtomRegistry';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import * as Op from '@dxos/automerge-proxy/Op';
import { Obj, Ref } from '@dxos/echo';
import { MetaId, ObjectDatabaseId, TypeId } from '@dxos/echo/internal';
import { TestSchema } from '@dxos/echo/testing';
import { PublicKey } from '@dxos/keys';

import { type EchoDatabase } from '../proxy-db/index.ts';
import { EchoTestBuilder, type EchoTestPeer } from '../testing/index.ts';
import { mirrorSnapshotAtom, routedSnapshotAtom } from './mirror-atoms.ts';

/** Refs compare by URI; everything else structurally. */
const normalize = (value: unknown): unknown => {
  if (Ref.isRef(value)) {
    return `ref:${value.uri.toString()}`;
  }
  if (Array.isArray(value)) {
    return value.map(normalize);
  }
  if (Op.isContainer(value)) {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, normalize(entry)]));
  }
  return value;
};

const MODES = ['Obj.atom', 'document atom', 'routed projection'] as const;

type Subscribe = 'none' | (typeof MODES)[number];

const atomFor = (subscribe: (typeof MODES)[number], obj: Obj.Unknown): Atom.Atom<unknown> => {
  switch (subscribe) {
    case 'Obj.atom':
      return Obj.atom(obj);
    case 'document atom':
      return mirrorSnapshotAtom(obj);
    case 'routed projection':
      return routedSnapshotAtom(obj);
  }
};

describe('mirror snapshot atoms', () => {
  let builder: EchoTestBuilder;
  let peer: EchoTestPeer;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
    peer = await builder.createPeer();
  });

  afterEach(async () => {
    await builder.close();
  });

  const openTab = async (): Promise<EchoDatabase> =>
    peer.createDatabase(PublicKey.random(), { client: await peer.createClient({ mirror: true }) });

  test('a snapshot read from the document matches Obj.atom', async () => {
    const db = await openTab();
    const target = db.add(Obj.make(TestSchema.Expando, { title: 'target' }));
    const obj = db.add(
      Obj.make(TestSchema.Expando, {
        title: 'hello',
        items: [{ label: 'a', done: false }],
        nested: { deep: { value: 1, list: [1, 2] } },
        link: Ref.make(target),
      }),
    );
    Obj.update(obj, (obj) => {
      Obj.getMeta(obj).keys.push({ source: 'test', id: 'key' });
    });
    await db.flush();

    const registry = AtomRegistry.make();
    const viaProxy = registry.get(Obj.atom(obj));
    const viaDocument = registry.get(mirrorSnapshotAtom(obj));
    expect(normalize(viaDocument)).toEqual(normalize(viaProxy));
    expect(normalize(registry.get(routedSnapshotAtom(obj)))).toEqual(normalize(viaProxy));
    expect(Reflect.get(viaDocument, MetaId)).toEqual(Reflect.get(viaProxy, MetaId));
    expect(Reflect.get(viaDocument, ObjectDatabaseId)).toBe(Reflect.get(viaProxy, ObjectDatabaseId));
    expect(Reflect.get(viaDocument, TypeId)).toEqual(Reflect.get(viaProxy, TypeId));
  });

  test('an edit notifies only the edited object, and unchanged values keep their identity', async () => {
    const notificationsPerEdit: Record<string, number> = {};
    for (const placeIn of ['linked-doc', 'root-doc'] as const) {
      const db = await openTab();
      const objects = Array.from({ length: 4 }, (_, index) =>
        db.add(
          Obj.make(TestSchema.Expando, {
            title: `object ${index}`,
            items: [
              { label: 'a', done: false },
              { label: 'b', done: false },
            ],
          }),
          { placeIn },
        ),
      );
      await db.flush();

      for (const subscribe of MODES) {
        const registry = AtomRegistry.make();
        const calls = objects.map(() => 0);
        const stops = objects.map((obj, index) =>
          registry.subscribe(
            atomFor(subscribe, obj),
            () => {
              calls[index]++;
            },
            { immediate: true },
          ),
        );
        calls.fill(0);
        const before = registry.get(atomFor(subscribe, objects[0]));
        Obj.update(objects[0], (obj) => {
          obj.items[1].label = subscribe;
        });
        const after = registry.get(atomFor(subscribe, objects[0]));
        stops.forEach((stop) => stop());

        // Obj.atom hears the write path and the document routing, so one edit can notify twice.
        expect(calls.slice(1), `${subscribe} ${placeIn}`).toEqual([0, 0, 0]);
        expect(calls[0], `${subscribe} ${placeIn}`).toBeGreaterThanOrEqual(1);
        if (subscribe !== 'Obj.atom') {
          expect(calls[0]).toBe(1);
        }
        notificationsPerEdit[`${subscribe}, ${placeIn}`] = calls[0];
        const keptItem = Op.getAt(after, ['items', 0]) === Op.getAt(before, ['items', 0]);
        // The proxy walk copies everything on every change; the document projection shares what did not change.
        expect(keptItem, `${subscribe} ${placeIn}`).toBe(subscribe !== 'Obj.atom');
        expect(Op.getAt(after, ['items', 1, 'label'])).toBe(subscribe);
      }
    }
    console.log({ notificationsPerEdit });
  });

  // Marginal cost of keeping snapshots current while one object is edited and every object is mounted.
  // `MIRROR_BENCH=1` runs it at full size.
  test('cost per edit against Obj.atom', { timeout: 600_000 }, async () => {
    const size = process.env.MIRROR_BENCH ? 1 : 0.05;
    const scenarios = [
      { name: 'small object, one item toggled', objects: 50, items: 20, edits: Math.round(1000 * size) },
      { name: 'large object, one item toggled', objects: 50, items: 1000, edits: Math.round(300 * size) },
      { name: 'inline objects, one title typed', objects: 200, items: 5, edits: Math.round(1000 * size), inline: true },
    ];
    const rows: Record<string, string | number>[] = [];
    for (const scenario of scenarios) {
      const timings: Record<Subscribe, number> = {
        'none': 0,
        'Obj.atom': 0,
        'document atom': 0,
        'routed projection': 0,
      };
      const perEdit: Record<Subscribe, number> = {
        'none': 0,
        'Obj.atom': 0,
        'document atom': 0,
        'routed projection': 0,
      };
      for (const subscribe of ['none', ...MODES] as const) {
        const db = await openTab();
        // Only the edited object is large; the others are mounted beside it.
        const objects = Array.from({ length: scenario.objects }, (_, index) =>
          db.add(
            Obj.make(TestSchema.Expando, {
              title: `object ${index}`,
              items: Array.from({ length: index === 0 ? scenario.items : 5 }, (_, item) => ({
                label: `item ${item}`,
                done: false,
              })),
            }),
            { placeIn: scenario.inline ? 'root-doc' : 'linked-doc' },
          ),
        );
        await db.flush();
        const registry = AtomRegistry.make();
        let notifications = 0;
        // Mounted as a component would mount them: read at once, then notified.
        const stops =
          subscribe === 'none'
            ? []
            : objects.map((obj) =>
                registry.subscribe(
                  atomFor(subscribe, obj),
                  () => {
                    notifications++;
                  },
                  { immediate: true },
                ),
              );
        const edit = (step: number) =>
          Obj.update(objects[0], (obj) => {
            if (scenario.inline) {
              obj.title = `${obj.title}x`;
            } else {
              obj.items[step % scenario.items].done = !obj.items[step % scenario.items].done;
            }
          });
        for (let step = 0; step < 20; step++) {
          edit(step);
        }
        await db.flush();
        notifications = 0;
        const start = performance.now();
        for (let step = 0; step < scenario.edits; step++) {
          edit(step);
        }
        timings[subscribe] = (performance.now() - start) / scenario.edits;
        perEdit[subscribe] = notifications / scenario.edits;
        await db.flush();
        stops.forEach((stop) => stop());
      }
      expect(perEdit['document atom']).toBe(1);
      expect(perEdit['routed projection']).toBe(1);
      rows.push({
        'scenario': scenario.name,
        'edit, no atoms (ms)': timings.none.toFixed(3),
        'Obj.atom (ms)': (timings['Obj.atom'] - timings.none).toFixed(3),
        'document atom (ms)': (timings['document atom'] - timings.none).toFixed(3),
        'routed projection (ms)': (timings['routed projection'] - timings.none).toFixed(3),
        'Obj.atom notifications': perEdit['Obj.atom'],
      });
    }
    console.table(rows);
  });
});
