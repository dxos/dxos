//
// Copyright 2021 DXOS.org
//

declare module 'humanhash';

declare module 'nanoerror' {
  export declare class Nanoerror extends Error {
    constructor(...args: any[]);

    static equals(error: any): boolean;
    static from(error: any): this;

    isNanoerror: true;
  }

  declare function nanoerror(type: string, format: string): typeof Nanoerror;
  export = nanoerror;
}

declare module 'buffer-json-encoding';

declare module 'hypercore-protocol' {
  import EventEmitter from 'node:events';

  export interface Stream extends EventEmitter {
    id: any;
  }

  declare function protocol(opts: any): Stream;

  export = protocol;
}

declare module 'nanoresource-promise/emitter';

declare module 'nanomessage';

declare module 'signal-promise';
