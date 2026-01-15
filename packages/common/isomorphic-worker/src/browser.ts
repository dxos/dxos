//
// Copyright 2025 DXOS.org
//

/// <reference lib="webworker" />

export class Worker extends globalThis.Worker {
  /**
   * Post message to the parent context.
   */
  static postMessage(message: any, transfer: Transferable[]): void;
  static postMessage(message: any, options?: StructuredSerializeOptions): void;
  static postMessage(data: any, options?: any) {
    globalThis.postMessage(data, options);
  }

  /**
   * Close the worker.
   */
  static close() {
    globalThis.close();
  }
}
