//
// Copyright 2026 DXOS.org
//

/**
 * Runs a wasm module's jobs in a dedicated worker, started on the first call and terminated once idle.
 * A realm never returns wasm memory, so terminating the worker that holds it is the only way to get
 * it back; the page keeps only what the jobs hand back.
 */
export class WasmWorker<Request, Response> {
  readonly #url: string;
  readonly #idleMs: number;
  readonly #pending = new Map<number, { resolve: (response: Response) => void; reject: (error: Error) => void }>();
  #worker?: Worker;
  #idle?: ReturnType<typeof setTimeout>;
  #next = 0;

  constructor(url: string, idleMs = 30_000) {
    this.#url = url;
    this.#idleMs = idleMs;
  }

  get running(): boolean {
    return this.#worker !== undefined;
  }

  call(request: Request, transfer: Transferable[] = []): Promise<Response> {
    clearTimeout(this.#idle);
    const worker = (this.#worker ??= this.#start());
    const id = this.#next++;
    return new Promise<Response>((resolve, reject) => {
      this.#pending.set(id, { resolve, reject });
      worker.postMessage({ id, request }, transfer);
    });
  }

  /** Terminates the worker now, freeing its wasm memory; a later call starts a new one. */
  release(): void {
    clearTimeout(this.#idle);
    this.#worker?.terminate();
    this.#worker = undefined;
    for (const { reject } of this.#pending.values()) {
      reject(new Error('The worker was released'));
    }
    this.#pending.clear();
  }

  #start(): Worker {
    const worker = new Worker(this.#url, { type: 'module' });
    worker.onmessage = (event: MessageEvent<{ id: number; response?: Response; error?: string }>) => {
      const pending = this.#pending.get(event.data.id);
      this.#pending.delete(event.data.id);
      if (event.data.error !== undefined) {
        pending?.reject(new Error(event.data.error));
      } else if (event.data.response !== undefined) {
        pending?.resolve(event.data.response);
      }
      if (this.#pending.size === 0) {
        this.#idle = setTimeout(() => this.release(), this.#idleMs);
      }
    };
    return worker;
  }
}

/** The worker's side: answers each request with `handle`, transferring what it returns in `transfer`. */
export const serveWasmJobs = <Request, Response>(
  handle: (request: Request) => Promise<{ response: Response; transfer?: Transferable[] }>,
): void => {
  addEventListener('message', (event: MessageEvent<{ id: number; request: Request }>) => {
    handle(event.data.request).then(
      ({ response, transfer = [] }) => postMessage({ id: event.data.id, response }, { transfer }),
      (err: unknown) => postMessage({ id: event.data.id, error: String(err) }),
    );
  });
};
