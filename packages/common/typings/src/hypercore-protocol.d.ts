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
  import ValueEncoding from 'hypercore';
  import type { Duplex } from 'streamx';

  interface StreamExtensionHandlers<T> {
    onmessage?: (message: Buffer) => any
    onerror?: (error: any) => any
    encoding?: ValueEncoding<T>
  }

  export interface StreamExtension {
    send: (message: Buffer) => void
    destroy: () => void
  }

  interface ChannelHandlers {
    onoptions?: (message: Buffer) => void
    onstatus?: (message: Buffer) => void
    onhave?: (message: Buffer) => void
    onunhave?: (message: Buffer) => void
    onwant?: (message: Buffer) => void
    onunwant?: (message: Buffer) => void
    onrequest?: (message: Buffer) => void
    oncancel?: (message: Buffer) => void
    ondata?: (message: Buffer) => void

    onextension?: (id: number, buffer: Buffer) => void
    onclose?: () => void
  }

  /**
   * https://github.com/hypercore-protocol/hypercore-protocol/blob/master/index.js#L236
   */
  export interface Channel {
    opened: boolean
    closed: boolean

    // Uses SHP to send messages (via locally defined Channelizer, which wraps the stream).
    // Message structures are defined by `scheme.proto`.
    // https://github.com/mafintosh/simple-hypercore-protocol
    // https://github.com/mafintosh/simple-hypercore-protocol/blob/master/schema.proto#L13
    // https://github.com/hypercore-protocol/hypercore-protocol/blob/master/index.js#L22

    options: (message: Buffer) => boolean
    status: (message: Buffer) => boolean
    have: (message: Buffer) => boolean
    unhave: (message: Buffer) => boolean
    want: (message: Buffer) => boolean
    unwant: (message: Buffer) => boolean
    request: (message: Buffer) => boolean
    cancel: (message: Buffer) => boolean
    data: (message: Buffer) => boolean

    // Send extension message; `id` is the index of the options extension.
    extension: (id: number, message: Buffer) => any

    // Close channel (e.g., to garbage collect feeds).
    close: () => void
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
  export class ProtocolStream<T> extends Duplex {
    state: any;
    destroyed: boolean;
    publicKey: Buffer;
    remotePublicKey: any;
    remoteExtensions: any;

    constructor (initiator?: boolean, opts?: ProtocolStreamOptions);

    // Signal intent to share hypercore feed.
    // https://github.com/hypercore-protocol/hypercore-protocol#const-channel--streamopenkey-handlers
    open (key: Buffer, handlers?: ChannelHandlers): Channel

    // Signal rejection (i.e., do not have feed).
    close (discoveryKey: Buffer): void

    // Destroy and close all feeds.
    destroy (error?: Error): void

    // Gracefully end stream.
    finalize (): void

    // Define custom messages unrelated to hypercore exchange.
    // https://github.com/hypercore-protocol/hypercore-protocol#stream-message-extensions
    registerExtension (name: string, handlers?: StreamExtensionHandlers<T>): StreamExtension
  }

  export = ProtocolStream
}
