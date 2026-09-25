//
// Copyright 2026 DXOS.org
//

// A page holding the space as tab documents: the model per document, no Automerge.

// The probe records wasm memories, so it loads before anything that could instantiate one.
// eslint-disable-next-line import/order
import './probe.ts';

import * as Draft from '@dxos/automerge-proxy/Draft';

import { Model } from '../../model.ts';
import { TabDoc } from '../../tab.ts';
import { type Latency, connect, fetchInput, fromBase64, measure } from './common.ts';

type Space = { objects: Record<string, { data: { content: string } }> };

let held: TabDoc[] = [];
const { request } = connect();
Reflect.set(globalThis, 'loadWorker', (docs: string[]) => request({ type: 'load', docs }));
Reflect.set(globalThis, 'workerMemory', () => request({ type: 'memory' }));
const acks = new Map<string, Promise<{ workerMs: number; error?: string }>>();

Reflect.set(globalThis, 'load', async () => {
  const docs = await fetchInput('input-tab');
  const start = performance.now();
  held = docs.map(
    (doc, index) =>
      new TabDoc(Model.fromSaved(fromBase64(doc.bytes), doc.hash), doc.heads, {
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
