//
// Copyright 2026 DXOS.org
//

// A page holding the space as Automerge replicas, as replica-mode ECHO does.

// The probe records wasm memories, so it loads before anything that could instantiate one.
// eslint-disable-next-line import/order
import './probe.ts';

import * as A from '@automerge/automerge/slim';

import { type Latency, connect, fetchInput, fromBase64, measure } from './common.ts';

type Space = { objects: Record<string, { data: { content: string } }> };

let held: A.Doc<Space>[] = [];
const { request } = connect();
Reflect.set(globalThis, 'loadWorker', (docs: string[]) => request({ type: 'load', docs }));
Reflect.set(globalThis, 'workerMemory', () => request({ type: 'memory' }));

// As Composer does: the slim entry, with the wasm fetched by URL rather than carried inline.
const ready = A.initializeWasm('/automerge.wasm');

Reflect.set(globalThis, 'load', async () => {
  const docs = await fetchInput('input-replica');
  await ready;
  const start = performance.now();
  held = docs.map((doc) => A.load<Space>(fromBase64(doc.bytes)));
  return measure(performance.now() - start);
});

/** What the documents themselves hold: the heap now, less the heap once they are released. */
Reflect.set(globalThis, 'release', async () => {
  const { heap: before } = await measure(0);
  held = [];
  const { heap: after } = await measure(0);
  return { freed: before - after, after };
});

Reflect.set(globalThis, 'write', async (docIndex: number, count: number): Promise<Latency> => {
  const latency: Latency = { tabMs: [], roundTripMs: [], workerMs: [] };
  const objectId = Object.keys(held[docIndex].objects)[0];
  for (let i = 0; i < count; i++) {
    const start = performance.now();
    held[docIndex] = A.change(held[docIndex], (draft) =>
      A.splice(draft, ['objects', objectId, 'data', 'content'], 0, 0, 'x'),
    );
    const bytes = A.getLastLocalChange(held[docIndex]);
    const written = performance.now();
    const reply = await request({ type: 'apply', doc: docIndex, bytes });
    if (reply.error) {
      throw new Error(reply.error);
    }
    latency.tabMs.push(written - start);
    latency.roundTripMs.push(performance.now() - start);
    latency.workerMs.push(reply.workerMs);
  }
  return latency;
});
