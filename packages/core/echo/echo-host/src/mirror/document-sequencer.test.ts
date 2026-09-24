//
// Copyright 2026 DXOS.org
//

import { next as A } from '@automerge/automerge';
import { describe, expect, test } from 'vitest';

import { Mirror, MirrorTesting } from '@dxos/echo-protocol';

import { applyOpsToDraft, toMirror } from './automerge-ops.ts';
import { DocumentSequencer, type SequencedDocument } from './document-sequencer.ts';

/**
 * A worker holding the real Automerge document. Writes land in `doc` at once but become visible to
 * tabs only when saved, as the host broadcasts only durable changes; a restart reverts to the last
 * save and forgets the sequencer's window.
 */
class TestWorker {
  doc: A.Doc<Record<string, unknown>>;
  saved: A.Doc<Record<string, unknown>>;
  sequencer: DocumentSequencer;
  epoch = 0;
  /** Durable entries of the current epoch, in order. */
  log: Mirror.Entry[] = [];
  /** Version of the last durable entry. */
  durableVersion = 0;
  #unsaved: Mirror.Entry[] = [];

  readonly target: SequencedDocument = {
    doc: () => this.doc,
    change: (callback, options) => {
      this.doc = A.change(this.doc, options, callback);
    },
  };

  constructor(initial: Record<string, unknown>) {
    this.doc = A.from(structuredClone(initial));
    this.saved = A.clone(this.doc);
    this.sequencer = new DocumentSequencer(A.getHeads(this.doc));
  }

  submit(clientId: string, batch: Mirror.Batch): 'applied' | 'resync' {
    const result = this.sequencer.submit(this.target, clientId, batch);
    this.#unsaved.push(...result.entries);
    if (result.type === 'rejected') {
      // The transforms and the document disagree, which is the property under test.
      throw result.error;
    }
    return result.type;
  }

  merge(remote: A.Doc<Record<string, unknown>>): void {
    this.doc = A.merge(this.doc, A.clone(remote));
    const entry = this.sequencer.absorb(this.doc);
    if (entry) {
      this.#unsaved.push(entry);
    }
  }

  save(): void {
    // Automerge documents are linear: a later change invalidates this reference, so keep a copy.
    this.saved = A.clone(this.doc);
    this.log.push(...this.#unsaved);
    this.durableVersion = this.log.at(-1)?.version ?? this.durableVersion;
    this.#unsaved = [];
  }

  restart(): void {
    this.doc = A.clone(this.saved);
    this.sequencer = new DocumentSequencer(A.getHeads(this.doc));
    this.epoch++;
    this.log = [];
    this.durableVersion = 0;
    this.#unsaved = [];
  }
}

type Tab = {
  state: Mirror.MirrorClientState;
  epoch: number;
  /** Index into the worker's durable log of the next entry to deliver. */
  delivered: number;
  /** Batches sent but not yet received by the worker; lost if it restarts. */
  inTransit: Mirror.Batch[];
  appended: number;
};

const LOG_PATH = ['log'];

const isProtected = (op: Mirror.Op) => op.path.length > 0 && op.path[0] === 'log';

describe('DocumentSequencer over Automerge', () => {
  test('tabs, a remote peer and worker restarts converge with every edit applied once', () => {
    const totals = { entries: 0, restarts: 0, recoveredAcks: 0, rebuilt: 0, resyncs: 0, markers: 0 };

    const seeds = Number(process.env.MIRROR_FUZZ_SEEDS ?? 120);
    for (let seed = 1; seed <= seeds; seed++) {
      const random = MirrorTesting.createRandom(seed);
      const initial = { ...MirrorTesting.initialDocument(), log: '' };
      const worker = new TestWorker(initial);
      let remote = A.clone(worker.doc);
      let remoteAppends = 0;
      const markers: string[] = [];
      let batchCounter = 0;

      const tabs: Tab[] = Array.from({ length: 2 + random.int(2) }, (_, index) => ({
        state: new Mirror.MirrorClientState(`tab-${index}`, toMirror(worker.doc), 0, A.getHeads(worker.doc)),
        epoch: 0,
        delivered: 0,
        inTransit: [],
        appended: 0,
      }));

      const recover = (tab: Tab) => {
        const entries = DocumentSequencer.recover(worker.saved, [...tab.state.heads]);
        if (!entries) {
          throw new Error(`seed ${seed}: ${tab.state.clientId} confirmed history the worker never saved`);
        }
        const hadInflight = tab.state.inflight?.batchId;
        const { rebuilt } = tab.state.recover(entries, worker.durableVersion, A.getHeads(worker.saved));
        if (hadInflight && entries.some((entry) => entry.origin?.batchId === hadInflight)) {
          totals.recoveredAcks++;
        }
        if (rebuilt) {
          totals.rebuilt++;
        }
        tab.epoch = worker.epoch;
        tab.delivered = worker.log.length;
        tab.inTransit = [];
      };

      const deliver = (tab: Tab) => {
        if (tab.epoch !== worker.epoch) {
          recover(tab);
          return;
        }
        const entry = worker.log[tab.delivered];
        if (entry) {
          tab.state.receive(entry);
          tab.delivered++;
        }
      };

      const receiveBatch = (tab: Tab) => {
        if (tab.epoch !== worker.epoch) {
          return;
        }
        const batch = tab.inTransit.shift();
        if (batch && worker.submit(tab.state.clientId, batch) === 'resync') {
          totals.resyncs++;
        }
      };

      for (let step = 0; step < 300; step++) {
        const tab = random.pick(tabs);
        const roll = random.int(20);
        if (roll < 5) {
          const op = MirrorTesting.randomOp(random, tab.state.current, tab.state.clientId);
          if (op && !isProtected(op)) {
            tab.state.applyLocal([op]);
          }
        } else if (roll < 7) {
          const marker = `|${tab.state.clientId}:${tab.appended++}|`;
          markers.push(marker);
          const text = Mirror.getAt(tab.state.current, LOG_PATH);
          const index = typeof text === 'string' ? text.length : 0;
          tab.state.applyLocal([{ type: 'splice', path: LOG_PATH, index, remove: 0, insert: marker }]);
        } else if (roll < 9) {
          if (tab.epoch === worker.epoch) {
            const batch = tab.state.takeBatch(`${tab.state.clientId}-${batchCounter++}`);
            if (batch) {
              tab.inTransit.push(batch);
            }
          }
        } else if (roll < 12) {
          receiveBatch(tab);
        } else if (roll < 15) {
          deliver(tab);
        } else if (roll < 16) {
          worker.save();
        } else if (roll < 18) {
          if (random.chance(0.5)) {
            const op = MirrorTesting.randomOp(random, toMirror(remote), 'R');
            if (op && !isProtected(op)) {
              remote = A.change(remote, (draft) => {
                applyOpsToDraft(draft, [op]);
              });
            }
          } else {
            const marker = `|remote:${remoteAppends++}|`;
            markers.push(marker);
            remote = A.change(remote, (draft) => {
              const text = Mirror.getAt(draft, LOG_PATH);
              A.splice(draft, [...LOG_PATH], typeof text === 'string' ? text.length : 0, 0, marker);
            });
          }
        } else if (roll < 19) {
          if (random.chance(0.5)) {
            worker.merge(remote);
          } else {
            remote = A.merge(remote, A.clone(worker.saved));
          }
        } else if (random.chance(0.15)) {
          worker.restart();
          totals.restarts++;
        }
      }

      // Quiesce: sync the remote peer, then drain every tab until nothing is pending anywhere.
      worker.merge(remote);
      worker.save();
      for (let round = 0; round < 40; round++) {
        for (const tab of tabs) {
          if (tab.epoch !== worker.epoch) {
            recover(tab);
          }
          while (tab.delivered < worker.log.length) {
            deliver(tab);
          }
          while (tab.inTransit.length > 0) {
            receiveBatch(tab);
          }
          const batch = tab.state.takeBatch(`${tab.state.clientId}-${batchCounter++}`);
          if (batch) {
            tab.inTransit.push(batch);
          }
        }
        worker.save();
      }
      remote = A.merge(remote, A.clone(worker.saved));

      const expected = toMirror(worker.doc);
      for (const tab of tabs) {
        expect(tab.state.hasPending).toBe(false);
        if (!Mirror.mirrorEquals(tab.state.current, expected)) {
          throw new Error(
            `seed ${seed}: ${tab.state.clientId} diverged\n${JSON.stringify(tab.state.current)}\n${JSON.stringify(expected)}`,
          );
        }
      }
      expect(Mirror.mirrorEquals(toMirror(remote), expected)).toBe(true);

      const log = Mirror.getAt(expected, LOG_PATH);
      expect(typeof log).toBe('string');
      for (const marker of markers) {
        const occurrences = String(log).split(marker).length - 1;
        if (occurrences !== 1) {
          throw new Error(`seed ${seed}: ${marker} appears ${occurrences} times in ${String(log)}`);
        }
      }
      totals.markers += markers.length;
      totals.entries += worker.sequencer.version;
    }

    console.log(totals);
    expect(totals.restarts).toBeGreaterThan(seeds / 4);
    expect(totals.recoveredAcks).toBeGreaterThan(0);
    expect(totals.markers).toBeGreaterThan(seeds * 15);
  });
});
