//
// Copyright 2026 DXOS.org
//

/** A document as base64 bytes, its change hashes as base64 of 32 bytes each, and its heads. */
export type DocInput = { bytes: string; hashes: string; heads: string[] };

export type Measure = { heap: number; wasm: number; loadMs: number };

export type Latency = { tabMs: number[]; roundTripMs: number[]; workerMs: number[] };

export const fromBase64 = (text: string): Uint8Array => Uint8Array.from(atob(text), (char) => char.charCodeAt(0));

/** Collects garbage a few times, as far as the page allows, so the heap figure is what is held. */
export const settle = async (): Promise<void> => {
  const collect: unknown = Reflect.get(globalThis, 'gc');
  for (let i = 0; i < 6; i++) {
    if (typeof collect === 'function') {
      Reflect.apply(collect, globalThis, []);
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
};

export const measure = async (loadMs: number): Promise<Measure> => {
  await settle();
  const memory: unknown = Reflect.get(performance, 'memory');
  const heap = typeof memory === 'object' && memory !== null ? Number(Reflect.get(memory, 'usedJSHeapSize')) : NaN;
  const wasmBytes: unknown = Reflect.get(globalThis, '__wasmBytes');
  const wasm = typeof wasmBytes === 'function' ? Number(Reflect.apply(wasmBytes, globalThis, [])) : 0;
  return { heap, wasm, loadMs };
};

/** The worker's port, and a request helper that awaits the matching reply. */
export const connect = () => {
  const worker = new SharedWorker('/worker.js', { type: 'module', name: 'space' });
  const waiting = new Map<number, (reply: { workerMs: number; error?: string }) => void>();
  worker.port.onmessage = (event: MessageEvent<{ id: number; workerMs: number; error?: string }>) => {
    waiting.get(event.data.id)?.(event.data);
    waiting.delete(event.data.id);
  };
  let next = 0;
  const request = (message: Record<string, unknown>, transfer: Transferable[] = []) =>
    new Promise<{ workerMs: number; error?: string }>((resolve) => {
      const id = next++;
      waiting.set(id, resolve);
      worker.port.postMessage({ ...message, id }, transfer);
    });
  return { request };
};

export const median = (values: number[]): number =>
  [...values].sort((left, right) => left - right)[Math.floor(values.length / 2)];

/** The corpus fetched by the page itself, so nothing outside it holds a reference once it is parsed. */
export const fetchInput = async (name: string): Promise<DocInput[]> => (await fetch(`/${name}.json`)).json();
