//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { InvalidOpError } from './errors.ts';
import * as Op from './Op.ts';
import * as Sync from './Sync.ts';
import { createRandom, initialDocument, randomOp } from './testing/index.ts';
import * as Transform from './Transform.ts';

describe('Transform.pair', () => {
  test('text edits at the same position keep the earlier writer first', () => {
    const base = Op.freeze({ text: 'abc' });
    const a: Op.Any = { type: 'splice', path: ['text'], index: 1, remove: 0, insert: 'X' };
    const b: Op.Any = { type: 'splice', path: ['text'], index: 1, remove: 0, insert: 'Y' };
    const viaB = Op.apply(Op.apply(base, [b]).root, Transform.pair(a, b, true), { strict: true }).root;
    const viaA = Op.apply(Op.apply(base, [a]).root, Transform.pair(b, a, false), { strict: true }).root;
    expect(viaA).toEqual({ text: 'aXYbc' });
    expect(viaB).toEqual(viaA);
  });

  test('an insert inside a removed range splits the removal', () => {
    const a: Op.Any = { type: 'remove', path: ['list', 1], count: 3 };
    const b: Op.Any = { type: 'insert', path: ['list', 2], values: ['new'] };
    expect(Transform.pair(a, b, false)).toEqual([
      { type: 'remove', path: ['list', 1], count: 1 },
      { type: 'remove', path: ['list', 2], count: 2 },
    ]);
  });

  test('an edit inside a replaced value is dropped', () => {
    const a: Op.Any = { type: 'splice', path: ['items', 0, 'title'], index: 0, remove: 0, insert: 'x' };
    const b: Op.Any = { type: 'put', path: ['items', 0], value: { title: 'replaced' } };
    expect(Transform.pair(a, b, false)).toEqual([]);
  });

  test('list indices inside nested paths shift', () => {
    const a: Op.Any = { type: 'splice', path: ['items', 2, 'title'], index: 0, remove: 0, insert: 'x' };
    const b: Op.Any = { type: 'insert', path: ['items', 0], values: [{}, {}] };
    expect(Transform.pair(a, b, false)).toEqual([{ ...a, path: ['items', 4, 'title'] }]);
  });

  // TP1: applying b then a' equals applying a then b', for random ops on nested documents.
  test('converges for random concurrent op pairs', () => {
    let checked = 0;
    let reshaped = 0;
    const kinds = new Set<string>();
    const seeds = Number(process.env.MIRROR_FUZZ_SEEDS ?? 3000);
    for (let seed = 1; seed <= seeds; seed++) {
      const random = createRandom(seed);
      let base: unknown = Op.freeze(initialDocument());
      for (let step = 0; step < random.int(8); step++) {
        const op = randomOp(random, base);
        if (op) {
          base = Op.apply(base, [op], { strict: true }).root;
        }
      }
      const as = Array.from({ length: 1 + random.int(3) }, () => undefined).reduce<Op.Any[]>((ops) => {
        const op = randomOp(random, Op.apply(base, ops).root, 'A');
        return op ? [...ops, op] : ops;
      }, []);
      const bs = Array.from({ length: 1 + random.int(3) }, () => undefined).reduce<Op.Any[]>((ops) => {
        const op = randomOp(random, Op.apply(base, ops).root, 'B');
        return op ? [...ops, op] : ops;
      }, []);
      const aFirst = random.chance(0.5);
      const rule = random.pick(['write-wins', 'later-wins'] as const);
      const [aPrime, bPrime] = Transform.lists(as, bs, aFirst, rule);
      if (aPrime.length !== as.length || bPrime.length !== bs.length) {
        reshaped++;
      }
      for (const op of [...as, ...bs]) {
        kinds.add(`${op.type}:${op.path.length}`);
      }
      const viaB = Op.apply(Op.apply(base, bs, { strict: true }).root, aPrime, { strict: true }).root;
      const viaA = Op.apply(Op.apply(base, as, { strict: true }).root, bPrime, { strict: true }).root;
      if (!Op.equals(viaA, viaB)) {
        throw new Error(
          `seed ${seed} diverged\nbase ${JSON.stringify(base)}\nA ${JSON.stringify(as)}\nB ${JSON.stringify(bs)}\naFirst ${aFirst} ${rule}\nviaA ${JSON.stringify(viaA)}\nviaB ${JSON.stringify(viaB)}`,
        );
      }
      checked++;
    }
    expect(checked).toBe(seeds);
    // The fuzz must reach drops and splits, and ops at several depths, or it proves little.
    console.log({ reshaped, kinds: kinds.size });
    expect(reshaped).toBeGreaterThan(300);
    expect([...kinds].filter((kind) => kind.startsWith('splice')).length).toBeGreaterThan(2);
    expect([...kinds].filter((kind) => kind.startsWith('remove')).length).toBeGreaterThan(1);
  });
});

/** An op no document ever fits, so the worker refuses the change that holds it. */
const poison = (id: string): Op.Any => ({ type: 'put', path: ['\u2620', 'x'], value: id });

const poisonIds = (changes: readonly (readonly Op.Any[])[]) =>
  changes.flat().flatMap((op) => (op.type === 'put' && op.path[0] === '\u2620' ? [String(op.value)] : []));

/**
 * Tabs and a remote writer against one sequencer over plain JSON. Every tab's visible state must
 * match the worker's at quiescence, whatever order messages were delivered in. Some changes hold an
 * op that does not fit, which the worker refuses: each must be reported by its tab exactly once.
 */
describe('Sync.ClientState with Sync.Sequencer', () => {
  test('tabs and a remote writer converge', () => {
    let totalEntries = 0;
    let staleBatches = 0;
    let concurrentReceives = 0;
    let refusals = 0;
    let lost = 0;
    const sessions = Math.max(1, Math.floor(Number(process.env.MIRROR_FUZZ_SEEDS ?? 3000) / 10));
    for (let seed = 1; seed <= sessions; seed++) {
      const random = createRandom(seed);
      const sequencer = new Sync.Sequencer();
      let worker: unknown = Op.freeze(initialDocument());
      const tabs = Array.from(
        { length: 2 + random.int(3) },
        (_, index) => new Sync.ClientState(`tab-${index}`, worker, 0, []),
      );
      const outbox = new Map<string, Sync.Batch[]>();
      const delivered = new Map<string, number>(tabs.map((tab) => [tab.clientId, 0]));
      const entries: Sync.Entry[] = [];
      const poisoned = new Set<string>();
      const reported: string[] = [];
      let batchCounter = 0;

      /** Writes a batch as the worker does: change by change, stopping at the first that does not fit. */
      const write = (clientId: string, batch: Sync.Batch) => {
        if (batch.baseVersion < sequencer.version) {
          staleBatches++;
        }
        const changes = sequencer.rebase(batch);
        if (!changes) {
          throw new Error(`seed ${seed}: batch ${batch.batchId} is outside the window`);
        }
        let refusedAt: number | undefined;
        for (const [index, change] of changes.entries()) {
          try {
            worker = Op.apply(worker, change, { strict: true }).root;
          } catch (err) {
            if (!(err instanceof InvalidOpError) || poisonIds([change]).length === 0) {
              throw new Error(`seed ${seed}: batch ${batch.batchId} change ${index} did not fit: ${String(err)}`);
            }
            refusedAt = index;
            break;
          }
        }
        entries.push(
          sequencer.append({
            ops: changes.slice(0, refusedAt).flat(),
            heads: [],
            origin: { clientId, batchId: batch.batchId, ...(refusedAt === undefined ? {} : { refusedAt }) },
          }),
        );
      };
      const deliveredCount = (tab: Sync.ClientState) => delivered.get(tab.clientId) ?? 0;

      const deliver = (tab: Sync.ClientState) => {
        const next = deliveredCount(tab);
        if (next < entries.length) {
          if (tab.hasPending && entries[next].origin?.clientId !== tab.clientId) {
            concurrentReceives++;
          }
          const { refused } = tab.receive(entries[next]);
          const ids = poisonIds(refused);
          reported.push(...ids);
          refusals += ids.length;
          lost += refused.length - ids.length;
          delivered.set(tab.clientId, next + 1);
        }
      };

      for (let step = 0; step < 400; step++) {
        const tab = random.pick(tabs);
        switch (random.int(5)) {
          case 0:
          case 1: {
            const op = randomOp(random, tab.current, tab.clientId);
            if (random.chance(0.03)) {
              const id = `${seed}:${step}`;
              poisoned.add(id);
              tab.applyLocal([...(op ? [op] : []), poison(id)]);
            } else if (op) {
              tab.applyLocal([op]);
            }
            break;
          }
          case 2: {
            const batch = tab.takeBatch(`b${batchCounter++}`);
            if (batch) {
              outbox.set(tab.clientId, [...(outbox.get(tab.clientId) ?? []), batch]);
            }
            break;
          }
          case 3: {
            const queue = outbox.get(tab.clientId) ?? [];
            const batch = queue.shift();
            if (batch) {
              write(tab.clientId, batch);
            }
            break;
          }
          case 4: {
            if (random.chance(0.3)) {
              const op = randomOp(random, worker, 'R');
              if (op) {
                worker = Op.apply(worker, [op], { strict: true }).root;
                entries.push(sequencer.append({ ops: [op], heads: [] }));
              }
            } else {
              deliver(tab);
            }
            break;
          }
        }
      }

      // Quiesce: flush every batch, deliver everything, repeat until nothing is pending.
      for (let round = 0; round < 50; round++) {
        for (const tab of tabs) {
          while (deliveredCount(tab) < entries.length) {
            deliver(tab);
          }
          const queue = outbox.get(tab.clientId) ?? [];
          for (let batch = queue.shift(); batch; batch = queue.shift()) {
            write(tab.clientId, batch);
          }
          const batch = tab.takeBatch(`b${batchCounter++}`);
          if (batch) {
            outbox.set(tab.clientId, [batch]);
          }
        }
      }

      for (const tab of tabs) {
        expect(tab.hasPending).toBe(false);
        if (!Op.equals(tab.current, worker)) {
          throw new Error(
            `seed ${seed}: ${tab.clientId} diverged\n${JSON.stringify(tab.current)}\n${JSON.stringify(worker)}`,
          );
        }
      }
      expect(reported.toSorted()).toEqual([...poisoned].toSorted());
      totalEntries += entries.length;
    }
    console.log({ totalEntries, staleBatches, concurrentReceives, refusals, lost });
    expect(totalEntries).toBeGreaterThan(10_000);
    expect(refusals).toBeGreaterThan(sessions);
    // Most of the value is in batches the worker had to transform and entries tabs had to rebase over.
    expect(staleBatches).toBeGreaterThan(2_000);
    expect(concurrentReceives).toBeGreaterThan(2_000);
  });
});
