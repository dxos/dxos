//
// Copyright 2026 DXOS.org
//

import type * as Diagram from './diagram.ts';

/**
 * Runs the illustrator's layout off the main thread: ELK plus routing every candidate takes seconds
 * for a dozen grouped boxes, which would freeze the chat while it runs.
 */

export type Request = { readonly id: number; readonly source: string };

export type Reply =
  | { readonly id: number; readonly objects: Awaited<ReturnType<typeof Diagram.layout>> }
  | { readonly id: number; readonly error: string };

/**
 * elkjs's bundled worker installs itself as this worker's message handler, instead of exporting,
 * when it sees `self` without `document`; it is first required inside `new ELK()`, which runs in
 * the synchronous prefix of `layout`, so a stub held across that call makes it export.
 */
const layoutWithStub = (diagram: typeof Diagram, source: string) => {
  Object.assign(globalThis, { document: {} });
  try {
    return diagram.layout(source);
  } finally {
    Reflect.deleteProperty(globalThis, 'document');
  }
};

let diagram: Promise<typeof Diagram> | undefined;

self.addEventListener('message', (event: MessageEvent<Request>) => {
  const { id, source } = event.data;
  diagram ??= import('./diagram.ts');
  void diagram
    .then((loaded) => layoutWithStub(loaded, source))
    .then(
      (objects) => self.postMessage({ id, objects } satisfies Reply),
      (cause) =>
        self.postMessage({ id, error: cause instanceof Error ? cause.message : String(cause) } satisfies Reply),
    );
});
