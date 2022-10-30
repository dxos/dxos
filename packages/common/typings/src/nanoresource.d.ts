//
// Copyright 2021 DXOS.org
//

/**
 * https://www.npmjs.com/package/nanoresource
 * https://github.com/mafintosh/nanoresource/blob/master/index.js
 */
declare module 'nanoresource' {
  import type { EventEmitter } from 'events';

  export type Callback<T> = (err: Error | null, result?: T) => void;

  export interface NanoresourceOptions {
    open: (cb: Callback<void>) => void;
    close: (cb: Callback<void>) => void;
  }

  export interface NanoresourceProperties {
    readonly opening: boolean;
    readonly opened: boolean; // Once opened this stays true.
    readonly closing: boolean;
    readonly closed: boolean; // Cannot be re-opened after closed.
  }

  export interface Nanoresource extends NanoresourceProperties, EventEmitter {
    open(cb?: Callback<void>): void;
    close(cb?: Callback<void>): void;
  }

  declare function nanoresource(options?: NanoresourceOptions): Nanoresource;

  export = nanoresource;
}
