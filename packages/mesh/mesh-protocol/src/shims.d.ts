//
// Copyright 2021 DXOS.org
//

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
  import events = require('events');

  export class Channel {
    options: (options: {extensions: any[]}) => any;
    extension: (id: number, message: Buffer) => any;
  }

  export interface ProtocolStreamCtorOpts {
    live?: boolean;
    // Set to false to disable encryption if you are already piping through a encrypted stream.
    encrypted?: true,
    // Set to false to disable the NOISE handshake completely. Requires encrypted = false, and also disables the capability verification.
    noise?: true,
    // Stream timeout. Set to 0 or false to disable.
    timeout?: 20000,
    // Use this keypair for the stream authentication.
    keyPair?: { publicKey: any, secretKey: any },
    // Hook to verify the remotes public key.
    onauthenticate?: (remotePublicKey: any, done: any) => any,
    // Function called when the stream handshake has finished.
    onhandshake?: (protocol: Protocol) => any,
    // Function called when the remote stream opens a channel you have not.
    ondiscoverykey?: (discoveryKey: any) => any,
    // Function called when a feed-channel closes.
    onchannelclose?: (discoveryKey: any, publicKey: any) => any
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

  interface ExtensionHandlers {
    onmessage?: (message: Buffer) => any,
    onerror?: (error: any) => any,
    encoding?: 'json' | 'utf-8' | 'binary',
  }

  export class ProtocolExtension {
    send: (message: buffer) => void;
    destroy: () => void;
  }

  export class ProtocolStream extends events.EventEmitter {
    publicKey: any;
    remotePublicKey: any;
    state: any;
    destroyed: boolean;

    constructor(initiator?: boolean, opts?: ProtocolStreamCtorOpts);

    open (key: any, handlers: ChannelHandlers): Channel;
    destroy (error?: any);
    finalize();

    registerExtension(name: string, handlers?: ExtensionHandlers): Extension;
  }

  export = ProtocolStream;
}

declare module 'nanomessage';

declare module 'signal-promise';
