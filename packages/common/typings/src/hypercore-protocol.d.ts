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
  import type { ValueEncoding } from 'hypercore';
  import type { Duplex } from 'streamx';

  /**
   * A multiplexed message channel associated with a feed.
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

    options: (message: any) => boolean
    status: (message: any) => boolean
    have: (message: any) => boolean
    unhave: (message: any) => boolean
    want: (message: any) => boolean
    unwant: (message: any) => boolean
    request: (message: any) => boolean
    cancel: (message: any) => boolean
    data: (message: any) => boolean

    // Send extension message; `id` is the index of the options extension.
    extension: (id: number, message: Buffer) => any

    // Close channel (e.g., to garbage collect feeds).
    close: () => void
  }

  interface ChannelHandlers {
    onoptions?: (message: any) => void
    onstatus?: (message: any) => void
    onhave?: (message: any) => void
    onunhave?: (message: any) => void
    onwant?: (message: any) => void
    onunwant?: (message: any) => void
    onrequest?: (message: any) => void
    oncancel?: (message: any) => void
    ondata?: (message: any) => void

    onextension?: (id: number, buffer: Buffer) => void
    onclose?: () => void
  }

  /**
   * Bi-directional custom message path for non-feed data exchange.
   * https://github.com/hypercore-protocol/hypercore/tree/v9.12.0#ext--feedregisterextensionname-handlers
   * https://github.com/hypercore-protocol/hypercore-protocol#stream-message-extensions
   */
  export interface StreamExtension {
    // Send message to extension handler on other side.
    send: (message: Buffer) => void

    // Destroy and unregister from stream.
    destroy: () => void
  }

  interface StreamExtensionHandlers<T> {
    encoding?: ValueEncoding<T>
    onmessage?: (message: Buffer) => any
    onerror?: (error: any) => any
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
   * Streams support the replication of feeds via multiplexed channels and custom extensions.
   * Before messages are exchanged there is a handshake phase using the Noise protocol.
   *
   * https://github.com/hypercore-protocol/hypercore-protocol#wire-protocol
   * https://github.com/hypercore-protocol/hypercore-protocol/blob/master/index.js#L332
   */
  export class ProtocolStream<T> extends Duplex {
    state: any;
    destroyed: boolean;
    publicKey: Buffer;
    remotePublicKey: any;
    remoteExtensions: any;

    constructor (initiator?: boolean, opts?: ProtocolStreamOptions);

    // Signal intent to share hypercore feed (includes proof that sender possesses the feed).
    // https://github.com/hypercore-protocol/hypercore-protocol#const-channel--streamopenkey-handlers
    open (key: Buffer, handlers?: ChannelHandlers): Channel

    // Signal rejection (i.e., do not have feed).
    close (discoveryKey: Buffer): void

    // Destroy stream.
    destroy (error?: Error): void

    // Gracefully end stream.
    finalize (): void

    // Define custom messages paths (unrelated to hypercore exchange), which are multiplexed on the stream.
    // https://github.com/hypercore-protocol/hypercore-protocol#stream-message-extensions
    registerExtension (name: string, handlers?: StreamExtensionHandlers<T>): StreamExtension
  }

  export = ProtocolStream
}
