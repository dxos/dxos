//
// Copyright 2021 DXOS.org
//

/**
 * Hypercore Protocol Typescript Definitions.
 *
 * https://hypercore-protocol.org
 * https://github.com/hypercore-protocol/hypercore-protocol
 * https://github.com/hypercore-protocol/hypercore-protocol/blob/master/index.js
 */
declare module 'hypercore-protocol' {
  import type { Duplex } from 'streamx';

  interface ChannelHandlers {
    onoptions?: (message: any) => any
    onstatus?: (message: any) => any
    onhave?: (message: any) => any
    onunhave?: (message: any) => any
    onwant?: (want: any) => any
    onunwant?: (unwant: any) => any
    onrequest?: (request: any) => any
    oncancel?: (cancel: any) => any
    ondata?: (data: any) => any
    onextension?: (id: any, buffer: any) => any
    onclose?: () => any
  }

  interface ExtensionHandlers {
    onmessage?: (message: Buffer) => any
    onerror?: (error: any) => any
    encoding?: 'json' | 'utf-8' | 'binary'
  }

  export interface StreamExtension {
    send: (message: Uint8Array) => void
    destroy: () => void
  }

  /**
   * https://github.com/hypercore-protocol/hypercore-protocol/blob/master/index.js#L236
   */
  export interface Channel {
    options: (options: { extensions: any[] }) => any
    extension: (id: number, message: Buffer) => any
  }

  /**
   * https://github.com/hypercore-protocol/hypercore-protocol#const-stream--new-protocolinitiator-options
   */
  export interface ProtocolStreamOptions {

    // Set to false to disable encryption if you are already piping through a encrypted stream.
    encrypted?: boolean

    // Set to false to disable the NOISE handshake completely. Requires encrypted = false, and also disables the capability verification.
    noise?: boolean

    // Stream timeout. Set to 0 or false to disable.
    timeout?: 20000

    // Use this keypair for the stream authentication.
    keyPair?: { publicKey: any, secretKey: any }

    // Hook to verify the remotes public key.
    onauthenticate?: (remotePublicKey: any, done: any) => any

    // Function called when the stream handshake has finished.
    onhandshake?: (protocol: ProtocolStream) => any

    // Function called when the remote stream opens a channel you have not.
    ondiscoverykey?: (discoveryKey: any) => any

    // Function called when a feed-channel closes.
    onchannelclose?: (discoveryKey: any, publicKey: any) => any
  }

  /**
   * https://github.com/hypercore-protocol/hypercore-protocol/blob/master/index.js#L332
   */
  export class ProtocolStream extends Duplex {
    state: any;
    destroyed: boolean;
    publicKey: any; // TODO(burdon): Buffer?
    remotePublicKey: any;
    remoteExtensions: any;

    constructor (initiator?: boolean, opts?: ProtocolStreamOptions);

    open (key: any, handlers: ChannelHandlers): Channel
    close (discoveryKey: any): void
    destroy (error?: Error): void
    finalize (): void
    registerExtension (name: string, handlers?: ExtensionHandlers): StreamExtension
  }

  export = ProtocolStream
}
