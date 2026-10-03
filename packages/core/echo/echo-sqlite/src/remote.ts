//
// Copyright 2026 DXOS.org
//

import { type CleanupFn } from '@dxos/async';
import { type SpaceId } from '@dxos/keys';

import { type StoredEntity } from './object-store.ts';
import { type EntityRecord } from './record.ts';
import { type CompiledQuery } from './sql/compile.ts';
import { type Run, type StoreDriver, makeLocalDriver } from './store-driver.ts';

/**
 * The slice of `MessagePort` the store protocol uses; satisfied by DOM and Node `worker_threads` ports.
 */
export interface StorePort {
  postMessage(message: unknown): void;
  addEventListener(type: 'message', listener: (event: MessageEvent) => void): void;
  removeEventListener(type: 'message', listener: (event: MessageEvent) => void): void;
  start?(): void;
}

type StoreCall =
  | { readonly op: 'open' }
  | { readonly op: 'load'; readonly id: string }
  | { readonly op: 'query' | 'explain'; readonly compiled: CompiledQuery }
  | { readonly op: 'write'; readonly records: readonly EntityRecord[]; readonly purged: readonly string[] }
  | { readonly op: 'deletedIds' | 'counts' };

type StoreRequest = { readonly id: number; readonly spaceId: SpaceId; readonly call: StoreCall };

type StoreResponse = { readonly id: number; readonly error?: string; readonly result?: unknown };

/** Message payloads are structured clones, which the platform types as `any`. */
type WireValue = MessageEvent['data'];

/**
 * Serves {@link StoreDriver} calls arriving on `port` from the SQL client behind `run`, so the
 * database's statements and transactions execute next to SQLite and each call crosses once.
 */
export const serveStore = (port: StorePort, run: Run): CleanupFn => {
  const drivers = new Map<SpaceId, StoreDriver>();
  // Async so a synchronous throw still becomes an error response rather than a call that never settles.
  const dispatch = async (driver: StoreDriver, call: StoreCall): Promise<unknown> => {
    switch (call.op) {
      case 'open':
        return driver.open();
      case 'load':
        return driver.load(call.id);
      case 'query':
        return driver.query(call.compiled);
      case 'explain':
        return driver.explain(call.compiled);
      case 'write':
        return driver.write(call.records, call.purged);
      case 'deletedIds':
        return driver.deletedIds();
      case 'counts':
        return driver.counts();
      default:
        // Requests arrive untyped over the port, so an unknown op is possible at runtime.
        throw new Error(`Unsupported store operation: ${String(Object.getOwnPropertyDescriptor(call, 'op')?.value)}`);
    }
  };

  const onMessage = (event: MessageEvent) => {
    const request: StoreRequest = event.data;
    let driver = drivers.get(request.spaceId);
    if (!driver) {
      driver = makeLocalDriver(request.spaceId, run);
      drivers.set(request.spaceId, driver);
    }
    dispatch(driver, request.call).then(
      (result) => port.postMessage({ id: request.id, result } satisfies StoreResponse),
      (error) => port.postMessage({ id: request.id, error: String(error) } satisfies StoreResponse),
    );
  };
  port.addEventListener('message', onMessage);
  port.start?.();
  return () => port.removeEventListener('message', onMessage);
};

/**
 * A {@link StoreDriver} for one space whose calls go to a {@link serveStore} host over `port`.
 */
export class RemoteStoreDriver implements StoreDriver {
  readonly #port: StorePort;
  readonly #spaceId: SpaceId;
  readonly #pending: PendingCalls;

  constructor(port: StorePort, spaceId: SpaceId) {
    this.#port = port;
    this.#spaceId = spaceId;
    this.#pending = PendingCalls.for(port);
  }

  open(): Promise<readonly StoredEntity[]> {
    return this.#call({ op: 'open' });
  }

  load(id: string): Promise<StoredEntity | undefined> {
    return this.#call({ op: 'load', id });
  }

  query(compiled: CompiledQuery): Promise<readonly StoredEntity[]> {
    return this.#call({ op: 'query', compiled });
  }

  explain(compiled: CompiledQuery): Promise<string[]> {
    return this.#call({ op: 'explain', compiled });
  }

  write(records: readonly EntityRecord[], purged: readonly string[]): Promise<void> {
    return this.#call({ op: 'write', records, purged });
  }

  deletedIds(): Promise<string[]> {
    return this.#call({ op: 'deletedIds' });
  }

  counts(): Promise<{ alive: number; deleted: number }> {
    return this.#call({ op: 'counts' });
  }

  #call(call: StoreCall): Promise<WireValue> {
    return this.#pending.send(this.#port, this.#spaceId, call);
  }
}

/**
 * Correlates responses with requests; one per port, shared by every space's driver on it.
 */
class PendingCalls {
  static readonly #byPort = new WeakMap<StorePort, PendingCalls>();

  static for(port: StorePort): PendingCalls {
    let pending = PendingCalls.#byPort.get(port);
    if (!pending) {
      pending = new PendingCalls(port);
      PendingCalls.#byPort.set(port, pending);
    }
    return pending;
  }

  readonly #calls = new Map<number, { resolve: (result: WireValue) => void; reject: (error: Error) => void }>();
  #nextId = 0;

  private constructor(port: StorePort) {
    port.addEventListener('message', (event) => {
      const response: StoreResponse = event.data;
      const call = this.#calls.get(response.id);
      if (!call) {
        return;
      }
      this.#calls.delete(response.id);
      if (response.error !== undefined) {
        call.reject(new Error(response.error));
      } else {
        call.resolve(response.result);
      }
    });
    port.start?.();
  }

  send(port: StorePort, spaceId: SpaceId, call: StoreCall): Promise<WireValue> {
    const id = this.#nextId++;
    return new Promise((resolve, reject) => {
      this.#calls.set(id, { resolve, reject });
      port.postMessage({ id, spaceId, call } satisfies StoreRequest);
    });
  }
}
