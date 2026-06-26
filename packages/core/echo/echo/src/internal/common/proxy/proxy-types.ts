//
// Copyright 2024 DXOS.org
//

/**
 * Reactive object proxy.
 */
export interface ReactiveHandler<T extends object> extends ProxyHandler<T> {
  /**
   * Target to Proxy mapping.
   */
  readonly _proxyMap: WeakMap<object, any>;

  /**
   * Called when a proxy is created for this target.
   */
  init(target: T): void;

  /**
   * Replace the string CRDT value at `path` with `newText`, applying a minimal diff so cursors and
   * concurrent edits are preserved. Implemented by handlers that back string fields; `Text.update`
   * dispatches here. Must run inside a change context (`Obj.update`).
   */
  textUpdate?(target: T, path: readonly (string | number)[], newText: string): void;

  /**
   * Splice the string CRDT value at `path` (character indices, mirroring `Array.splice`): remove
   * `deleteCount` characters at `start` and insert `insert`. Returns the removed substring. `Text.splice`
   * dispatches here. Must run inside a change context (`Obj.update`).
   */
  textSplice?(target: T, path: readonly (string | number)[], start: number, deleteCount: number, insert: string): string;
}

/**
 * For debug-dumping the data of the object.
 */
export const objectData = Symbol.for('@dxos/live-object/objectData');
