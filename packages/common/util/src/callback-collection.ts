//
// Copyright 2024 DXOS.org
//

/**
 * A collection of async functions.
 */
export class CallbackCollection<F extends (...args: any[]) => Promise<any>> {
  #callbacks: F[] = [];

  append(callback: F) {
    this.#callbacks.push(callback);
  }

  prepend(callback: F) {
    this.#callbacks.unshift(callback);
  }

  remove(callback: F) {
    this.#callbacks = this.#callbacks.filter((c) => c !== callback);
  }

  callParallel(...args: Parameters<F>): Promise<ReturnType<F>[]> {
    return Promise.all(this.#callbacks.map((callback) => callback(...args)));
  }

  async callSerial(...args: Parameters<F>): Promise<ReturnType<F>[]> {
    const results: ReturnType<F>[] = [];
    for (const callback of this.#callbacks) {
      results.push(await callback(...args));
    }
    return results;
  }
}
