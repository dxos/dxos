//
// Copyright 2026 DXOS.org
//

import type { MermaidEngine, Scene } from '@dxos/diagram';

import type * as Diagram from './diagram.ts';
import type { RouteReply, RouteRequest } from './route.worker.ts';

/**
 * Runs the illustrator's layout off the main thread: ELK places each candidate here while a pool of
 * route workers routes them, which is nearly all of the seconds a grouped diagram takes.
 */

export type Request = { readonly id: number; readonly source: string; readonly width?: number };

export type Reply =
  | { readonly id: number; readonly objects: Awaited<ReturnType<typeof Diagram.layout>> }
  | { readonly id: number; readonly error: string };

/** One core stays with this worker's placement; past four, routing waits on placement rather than cores. */
const POOL_SIZE = Math.max(1, Math.min(4, (navigator.hardwareConcurrency || 2) - 1));

type Task = {
  readonly id: number;
  readonly job: MermaidEngine.EmitJob;
  readonly resolve: (commands: Scene.Command[]) => void;
  readonly reject: (error: Error) => void;
};

let routeSeq = 0;
const queue: Task[] = [];
const running = new Map<number, { readonly worker: Worker; readonly task: Task }>();
let idle: Worker[] | undefined;

const dispatch = (worker: Worker) => {
  const task = queue.shift();
  if (task) {
    running.set(task.id, { worker, task });
    worker.postMessage({ id: task.id, job: task.job } satisfies RouteRequest);
  } else {
    idle?.push(worker);
  }
};

const startPool = (): Worker[] =>
  Array.from({ length: POOL_SIZE }, () => {
    const worker = new Worker(new URL('./route.worker.ts', import.meta.url), { type: 'module' });
    worker.addEventListener('message', (event: MessageEvent<RouteReply>) => {
      const reply = event.data;
      const entry = running.get(reply.id);
      running.delete(reply.id);
      if ('error' in reply) {
        entry?.task.reject(new Error(reply.error));
      } else {
        entry?.task.resolve(reply.commands);
      }
      dispatch(worker);
    });
    // A job's own failure comes back as a reply; this is the worker dying, after which nothing it
    // holds will be answered, so its jobs fail rather than leaving their diagrams laying out forever.
    worker.addEventListener('error', (event) => {
      for (const [id, entry] of running) {
        if (entry.worker === worker) {
          running.delete(id);
          entry.task.reject(new Error(event.message || 'A diagram route worker failed.'));
        }
      }
    });
    return worker;
  });

const emitCandidate = (job: MermaidEngine.EmitJob): Promise<Scene.Command[]> =>
  new Promise((resolve, reject) => {
    idle ??= startPool();
    queue.push({ id: routeSeq++, job, resolve, reject });
    const worker = idle.pop();
    if (worker) {
      dispatch(worker);
    }
  });

/**
 * elkjs's bundled worker installs itself as this worker's message handler, instead of exporting,
 * when it sees `self` without `document`; it is first required inside `new ELK()`, which runs in
 * the synchronous prefix of `layout`, so a stub held across that call makes it export.
 */
const layoutWithStub = (diagram: typeof Diagram, { source, width }: Request) => {
  Object.assign(globalThis, { document: {} });
  try {
    return diagram.layout(source, { emitCandidate, width });
  } finally {
    Reflect.deleteProperty(globalThis, 'document');
  }
};

let diagram: Promise<typeof Diagram> | undefined;

self.addEventListener('message', (event: MessageEvent<Request>) => {
  const { id } = event.data;
  diagram ??= import('./diagram.ts');
  void diagram
    .then((loaded) => layoutWithStub(loaded, event.data))
    .then(
      (objects) => self.postMessage({ id, objects } satisfies Reply),
      (cause) =>
        self.postMessage({ id, error: cause instanceof Error ? cause.message : String(cause) } satisfies Reply),
    );
});
