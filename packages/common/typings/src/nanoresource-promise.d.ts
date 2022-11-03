//
// Copyright 2021 DXOS.org
//

/**
 * https://www.npmjs.com/package/nanomessage-promise
 */
declare module 'nanoresource-promise' {
  import { EventEmitter } from 'events';

  export declare class NanoresourcePromise extends EventEmitter {
    constructor(...args: any[]);

    readonly opening: boolean;
    readonly opened: boolean; // Once opened this stays true.
    readonly closing: boolean;
    readonly closed: boolean; // Cannot be re-opened after closed.

    open(): Promise<any>;
    close(allowActive?: boolean): Promise<any>;
  }
}
