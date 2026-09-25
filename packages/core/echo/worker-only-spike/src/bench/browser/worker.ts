//
// Copyright 2026 DXOS.org
//

// The worker: holds the space in Automerge and takes writes from tabs. A tab document's change is
// checked to be canonically encoded before Automerge applies it; a replica's change is applied as is.

// The probe records wasm memories, so it loads before anything that could instantiate one.
// eslint-disable-next-line import/order
import './probe.ts';

import * as A from '@automerge/automerge';

import { encodeChange } from '../../encode.ts';
import { decodeChange } from '../../host.ts';
import { fromBase64 } from './common.ts';

type Request =
  | { id: number; type: 'load'; docs: string[] }
  | { id: number; type: 'submit'; doc: number; bytes: Uint8Array }
  | { id: number; type: 'apply'; doc: number; bytes: Uint8Array }
  | { id: number; type: 'memory' };

let docs: A.Doc<unknown>[] | undefined;

const handle = (request: Request): { workerMs: number; error?: string; wasm?: number } => {
  const start = performance.now();
  try {
    if (request.type === 'load') {
      docs ??= request.docs.map((bytes) => A.load(fromBase64(bytes)));
    } else if (request.type === 'memory') {
      const wasmBytes: unknown = Reflect.get(globalThis, '__wasmBytes');
      return {
        workerMs: 0,
        wasm: typeof wasmBytes === 'function' ? Number(Reflect.apply(wasmBytes, globalThis, [])) : 0,
      };
    } else if (docs) {
      if (request.type === 'submit') {
        const change = decodeChange(request.bytes);
        const canonical = encodeChange(change).bytes;
        if (
          canonical.length !== request.bytes.length ||
          canonical.some((byte, index) => byte !== request.bytes[index])
        ) {
          return { workerMs: performance.now() - start, error: 'not canonically encoded' };
        }
      }
      [docs[request.doc]] = A.applyChanges(docs[request.doc], [request.bytes]);
    }
    return { workerMs: performance.now() - start };
  } catch (err) {
    return { workerMs: performance.now() - start, error: String(err) };
  }
};

Reflect.set(globalThis, 'onconnect', (event: MessageEvent) => {
  const [port] = event.ports;
  port.onmessage = (message: MessageEvent<Request>) =>
    port.postMessage({ id: message.data.id, ...handle(message.data) });
});
