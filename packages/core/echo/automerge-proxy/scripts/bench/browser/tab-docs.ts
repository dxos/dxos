//
// Copyright 2026 DXOS.org
//

// A page holding the space as tab documents: the model per document, no Automerge.

// The probe records wasm memories, so it loads before anything that could instantiate one.
// eslint-disable-next-line import/order
import './probe.ts';

import * as Draft from '../../../src/Draft.ts';
import { Model } from '../../../src/internal/model.ts';
import { readChange } from '../../../src/internal/reader.ts';
import { TabDoc } from '../../../src/internal/tab-doc.ts';
import { type Latency, connect, fetchInput, fromBase64, measure } from './common.ts';

type Space = { objects: Record<string, { data: { content: string } }> };

let held: TabDoc<Space>[] = [];
const { request } = connect();
Reflect.set(globalThis, 'loadWorker', (docs: string[]) => request({ type: 'load', docs, check: true }));
Reflect.set(globalThis, 'workerMemory', () => request({ type: 'memory' }));
const acks = new Map<string, Promise<{ workerMs: number; error?: string }>>();

Reflect.set(globalThis, 'load', async () => {
  const docs = await fetchInput('input-tab');
  // Decoded before the clock starts: a worker hands the tab bytes, not base64.
  const inputs = docs.map((doc) => ({
    bytes: fromBase64(doc.bytes),
    hashes: fromBase64(doc.hashes),
    heads: doc.heads,
  }));
  const start = performance.now();
  held = inputs.map(
    (doc, index) =>
      new TabDoc<Space>(Model.fromSaved(doc.bytes, doc.hashes), doc.heads, {
        send: (change, bytes) => acks.set(change.hash, request({ type: 'submit', doc: index, bytes })),
      }),
  );
  return measure(performance.now() - start);
});

/** What the documents themselves hold: the heap now, less the heap once they are released. */
Reflect.set(globalThis, 'release', async () => {
  const { heap: before } = await measure(0);
  held = [];
  acks.clear();
  const { heap: after } = await measure(0);
  return { freed: before - after, after };
});

/** Another peer's changes arriving one at a time, as the worker forwards them: each decoded, applied, then read. */
Reflect.set(globalThis, 'receive', (docIndex: number, changes: string[]): number[] => {
  const tab = held[docIndex];
  const objectId = Object.keys(tab.doc().objects)[0];
  return changes.map((text) => {
    const bytes = fromBase64(text);
    const start = performance.now();
    const { end: _end, ...change } = readChange(bytes);
    tab.receive({ type: 'change', change });
    void tab.doc().objects[objectId].data.content.length;
    return performance.now() - start;
  });
});

Reflect.set(globalThis, 'write', async (docIndex: number, count: number): Promise<Latency> => {
  const latency: Latency = { tabMs: [], roundTripMs: [], workerMs: [] };
  const tab = held[docIndex];
  const objectId = Object.keys(tab.doc().objects)[0];
  for (let i = 0; i < count; i++) {
    const start = performance.now();
    const [hash] =
      tab.change((draft: Space) => Draft.splice(draft, ['objects', objectId, 'data', 'content'], 0, 0, 'x')) ?? [];
    const written = performance.now();
    const reply = await acks.get(hash);
    if (!reply || reply.error) {
      throw new Error(reply?.error ?? 'No reply');
    }
    latency.tabMs.push(written - start);
    latency.roundTripMs.push(performance.now() - start);
    latency.workerMs.push(reply.workerMs);
  }
  return latency;
});
