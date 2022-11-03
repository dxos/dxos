//
// Copyright 2021 DXOS.org
//

/**
 * https://www.npmjs.com/package/nanomessage
 * https://github.com/geut/nanomessage/tree/v8.4.0
 */
declare module 'nanomessage' {
  import { NanoresourcePromise } from 'nanoresource-promise';

  export declare class Nanomessage extends NanoresourcePromise {
    constructor(...args: any[]);

    _open(): Promise<any>;
    _close(): Promise<any>;

    _send(buffer: any): Promise<any>;
    _subscribe(next: (data: any) => Promise<void>): void;

    _onMessage(data: any, opts?: any): Promise<any>;

    send(buffer: any): Promise<any>;
    request(data: any, opts?: any): Promise<any>;
  }

  export const errors = {
    NMSG_ERR_TIMEOUT
  };
}
