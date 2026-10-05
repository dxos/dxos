//
// Copyright 2026 DXOS.org
//

import type * as Diagram from './diagram.ts';

/**
 * Runs the illustrator's layout off the main thread: the semantic engine's placement search and
 * its ELK candidates are the seconds a large diagram takes.
 */

export type Request = { readonly id: number; readonly source: string };

export type Reply =
  | { readonly id: number; readonly objects: Awaited<ReturnType<typeof Diagram.layout>> }
  | { readonly id: number; readonly error: string };

/**
 * elkjs's bundled worker installs itself as this worker's message handler, instead of exporting,
 * when it sees `self` without `document`; it is first required while the engine lays out an
 * unhinted diagram, so a stub held across the layout makes it export.
 */
const layoutWithStub = async (diagram: typeof Diagram, source: string) => {
  Object.assign(globalThis, { document: {} });
  try {
    return await diagram.layout(source);
  } finally {
    Reflect.deleteProperty(globalThis, 'document');
  }
};

let diagram: Promise<typeof Diagram> | undefined;

// One layout at a time, so the `document` stub of one never outlives or precedes another's.
let queue: Promise<unknown> = Promise.resolve();

self.addEventListener('message', (event: MessageEvent<Request>) => {
  const { id, source } = event.data;
  diagram ??= import('./diagram.ts');
  const loaded = diagram;
  queue = queue.then(() =>
    loaded
      .then((module) => layoutWithStub(module, source))
      .then(
        (objects) => self.postMessage({ id, objects } satisfies Reply),
        (cause) =>
          self.postMessage({ id, error: cause instanceof Error ? cause.message : String(cause) } satisfies Reply),
      ),
  );
});
