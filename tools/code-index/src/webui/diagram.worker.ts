//
// Copyright 2026 DXOS.org
//

import type * as Diagram from './diagram.ts';

/**
 * Runs the illustrator's layout off the main thread. A large diagram is answered twice: a quick
 * layout in seconds, then the full search's when it finishes, which can take minutes. Every quick
 * layout runs before any full one, so a large diagram never holds back the first drawing of another.
 */

export type Request = { readonly id: number; readonly source: string };

export type Reply =
  | {
      readonly id: number;
      readonly objects: Awaited<ReturnType<typeof Diagram.layout>>;
      /** False while a better layout is still coming for this request. */
      readonly final: boolean;
    }
  | { readonly id: number; readonly error: string };

type Job = { readonly id: number; readonly source: string; readonly quality: Diagram.Quality; readonly final: boolean };

/**
 * elkjs's bundled worker installs itself as this worker's message handler, instead of exporting,
 * when it sees `self` without `document`; it is first required while the engine lays out an
 * unhinted diagram, so a stub held across the layout makes it export.
 */
const layoutWithStub = async (diagram: typeof Diagram, job: Job) => {
  Object.assign(globalThis, { document: {} });
  try {
    return await diagram.layout(job.source, job.quality);
  } finally {
    Reflect.deleteProperty(globalThis, 'document');
  }
};

const loaded = import('./diagram.ts');
const quick: Job[] = [];
const full: Job[] = [];
let running = false;

/** One layout at a time, so the `document` stub of one never outlives or precedes another's. */
const drain = async (): Promise<void> => {
  if (running) {
    return;
  }
  running = true;
  const diagram = await loaded;
  for (let job = quick.shift() ?? full.shift(); job; job = quick.shift() ?? full.shift()) {
    const { id, final } = job;
    try {
      self.postMessage({ id, objects: await layoutWithStub(diagram, job), final } satisfies Reply);
    } catch (cause) {
      // A failed quick layout still leaves the full one to try; only the last word is an error.
      if (final) {
        self.postMessage({ id, error: cause instanceof Error ? cause.message : String(cause) } satisfies Reply);
      }
    }
  }
  running = false;
};

self.addEventListener('message', (event: MessageEvent<Request>) => {
  const { id, source } = event.data;
  void loaded.then((diagram) => {
    if (diagram.sizeOf(source) > diagram.QUICK_FIRST) {
      quick.push({ id, source, quality: 'quick', final: false });
    }
    full.push({ id, source, quality: 'full', final: true });
    void drain();
  });
});
