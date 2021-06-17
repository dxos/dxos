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

  export class Channel {

  }

  export interface ProtocolStreamCtorOpts {
    live?: boolean;
    encrypted?: true, // set to false to disable encryption if you are already piping through a encrypted stream
    noise?: true, // set to false to disable the NOISE handshake completely. Requires encrypted = false, and also disables the capability verification
    timeout?: 20000, // stream timeout. set to 0 or false to disable.
    keyPair?: { publicKey: any, secretKey: any }, // use this keypair for the stream authentication
    onauthenticate?: (remotePublicKey: any, done: any) => any, // hook to verify the remotes public key
    onhandshake?: () => any, // function called when the stream handshake has finished
    ondiscoverykey?: (discoveryKey: any) => any, // function called when the remote stream opens a channel you have not
    onchannelclose?: (discoveryKey: any, publicKey: any) => any // function called when a feed-channel closes
  }

  interface ChannelHandlers {
    onoptions?: (message: any) => any,
    onstatus?: (message: any) => any,
    onhave?: (message: any) => any,
    onunhave?: (message: any) => any,
    onwant?: (want: any) => any,
    onunwant?: (unwant: any) => any,
    onrequest?: (request: any) => any,
    oncancel?: (cancel: any) => any,
    ondata?: (data: any) => any,
    onextension?: (id: any, buffer: any) => any,
    onclose?: () => any,
  }

  export class ProtocolStream extends EventEmitter {
    id: any;

    constructor(initiator?: boolean, opts?: ProtocolStreamCtorOpts);

    open (key: any, handlers: ChannelHandlers): Channel;
  }

  export = ProtocolStream;
}

declare module 'nanoresource-promise/emitter';

declare module 'nanomessage';

declare module 'signal-promise';
