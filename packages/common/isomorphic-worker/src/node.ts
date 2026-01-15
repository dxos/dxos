//
// Copyright 2025 DXOS.org
//

import * as WorkerThreads from 'node:worker_threads';

export class Worker extends EventTarget implements globalThis.Worker {
  /**
   * Post message to the parent context.
   */
  static postMessage(message: any, transfer: Transferable[]): void;
  static postMessage(message: any, options?: StructuredSerializeOptions): void;
  static postMessage(data: any, options?: any) {
    WorkerThreads.parentPort!.postMessage(data, Array.isArray(options) ? options : options?.transfer);
  }

  /**
   * Close the worker.
   */
  static close() {
    // No-op, since there are not equivalent API in Node.js
  }

  #worker: WorkerThreads.Worker;
  #onmessage: ((this: globalThis.Worker, ev: MessageEvent) => any) | null = null;
  #onmessageerror: ((this: globalThis.Worker, ev: MessageEvent) => any) | null = null;
  #onerror: ((this: AbstractWorker, ev: ErrorEvent) => any) | null = null;

  constructor(url: string | URL, options?: WorkerOptions) {
    super();
    this.#worker = new WorkerThreads.Worker(url, options as WorkerThreads.WorkerOptions);

    this.#worker.on('message', (data: any) => {
      this.dispatchEvent(new MessageEvent('message', { data }));
    });

    this.#worker.on('error', (error: any) => {
      const event = new ErrorEvent('error', { error, message: error.message });
      this.dispatchEvent(event);
    });

    this.#worker.on('messageerror', (error: any) => {
      this.dispatchEvent(new MessageEvent('messageerror', { data: error }));
    });
  }

  postMessage(message: unknown, options?: any): void {
    let transfer: any[] | undefined;
    if (Array.isArray(options)) {
      transfer = options;
    } else if (options && typeof options === 'object') {
      transfer = options.transfer;
    }
    this.#worker.postMessage(message, transfer);
  }

  terminate(): void {
    void this.#worker.terminate();
  }

  get onmessage() {
    return this.#onmessage;
  }

  set onmessage(listener: ((this: globalThis.Worker, ev: MessageEvent) => any) | null) {
    if (this.#onmessage) {
      this.removeEventListener('message', this.#onmessage as any);
    }
    this.#onmessage = listener;
    if (listener) {
      this.addEventListener('message', listener as any);
    }
  }

  get onerror() {
    return this.#onerror;
  }

  set onerror(listener: ((this: AbstractWorker, ev: ErrorEvent) => any) | null) {
    if (this.#onerror) {
      this.removeEventListener('error', this.#onerror as any);
    }
    this.#onerror = listener;
    if (listener) {
      this.addEventListener('error', listener as any);
    }
  }

  get onmessageerror() {
    return this.#onmessageerror;
  }

  set onmessageerror(listener: ((this: globalThis.Worker, ev: MessageEvent) => any) | null) {
    if (this.#onmessageerror) {
      this.removeEventListener('messageerror', this.#onmessageerror as any);
    }
    this.#onmessageerror = listener;
    if (listener) {
      this.addEventListener('messageerror', listener as any);
    }
  }
}
