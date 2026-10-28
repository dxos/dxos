//
// Copyright 2026 DXOS.org
//

//
// The effect worker (F-5.1): runs agent-written effects away from the page, with no DOM, network or storage. The
// capabilities a worker has are removed before any effect loads; the module's own scope shadows the rest. Started by
// `createEffectWorker`.
//

import { type CoreRequest, EffectCore } from './core.ts';

const post = globalThis.postMessage.bind(globalThis);

for (const name of [
  'fetch',
  'XMLHttpRequest',
  'WebSocket',
  'WebSocketStream',
  'EventSource',
  'importScripts',
  'indexedDB',
  'caches',
  'BroadcastChannel',
  'Worker',
  'SharedWorker',
  'Request',
  'navigator',
]) {
  try {
    Object.defineProperty(globalThis, name, { value: undefined, configurable: false, writable: false });
  } catch {
    Reflect.deleteProperty(globalThis, name);
  }
}

// The budget is the only reader of the wall clock here; it never drives what is drawn.
const now = performance.now.bind(performance);
const core = new EffectCore({ now });

globalThis.addEventListener('message', (event: MessageEvent<CoreRequest>) => {
  const response = core.handle(event.data);
  if (response) {
    post(response);
  }
});
