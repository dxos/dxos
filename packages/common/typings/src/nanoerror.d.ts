//
// Copyright 2021 DXOS.org
//

/**
 * https://www.npmjs.com/package/nanoerror
 */
declare module 'nanoerror' {
  export declare class Nanoerror extends Error {
    readonly isNanoerror: boolean;

    constructor(...args: any[]);

    static equals(error: any): boolean;
    static from(error: any): this;
  }

  declare function nanoerror(type: string, format: string): typeof Nanoerror;

  export = nanoerror;
}
