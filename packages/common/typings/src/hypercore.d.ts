//
// Copyright 2021 DXOS.org
//

// https://github.com/RangerMauve/hyper-typings/blob/default/promises.ts

/**
 * Hypercore Typescript Definitions version 9.12.0
 * NOTE: Must not clash with 'hypercore' package name.
 *
 * https://hypercore-protocol.org
 * https://www.npmjs.com/package/hypercore/v/9.12.0
 * https://github.com/hypercore-protocol/hypercore/tree/v9.12.0
 * https://github.com/hypercore-protocol/hypercore/blob/v9.12.0/index.js#L53
 */
declare module 'hypercore' {
  import { EventEmitter } from 'events';
  import type { ProtocolStream } from 'hypercore-protocol';
  import type { RandomAccessStorage } from 'random-access-storage';
  import { Readable, Writable } from 'streamx';

  export type Callback<T> = (err: Error | null, result: T) => void;

  /**
   * https://github.com/mafintosh/abstract-encoding
   */
  export type AbstractValueEncoding<T = any> = {
    encode: (obj: T) => Buffer;
    decode: (buffer: Buffer) => T;
  };

  export type ValueEncoding<T = any> = 'json' | 'utf-8' | 'binary' | AbstractValueEncoding<T>;

  /**
   * Crypto
   */
  export interface Crypto {
    sign: (data: any, secretKey: Buffer, cb: Callback<any>) => void;
    verify: (signature: any, data: any, key: Buffer, cb: Callback<boolean>) => void;
  }

  /**
   * https://github.com/hypercore-protocol/hypercore/tree/v9.12.0#var-stream--feedcreatereadstreamoptions
   */
  export type ReadStreamOptions = {
    start?: number;
    end?: number;
    snapshot?: boolean;
    tail?: boolean;
    live?: boolean;
    timeout?: number;
    wait?: boolean;
    batch?: number;
  };

  /**
   * https://github.com/hypercore-protocol/hypercore/tree/v9.12.0#const-id--feedgetindex-options-callback
   */
  // TODO(burdon): Change all value defs to default.
  export type GetOptions = {
    wait?: true;
    onwait?: () => {};
    timeout?: 0;
    valueEncoding?: ValueEncoding;
  };

  /**
   * https://github.com/hypercore-protocol/hypercore/tree/v9.12.0#var-stream--feedcreatewritestreamopts
   */
  export type WriteStreamOptions = {
    maxBlockSize?: number;
  };

  /**
   * https://github.com/hypercore-protocol/hypercore/tree/v9.12.0#var-stream--feedreplicateisinitiator-options
   */
  export type ReplicationOptions = {
    initiator?: ProtocolStream | boolean;
    stream?: ProtocolStream;
    live?: boolean;
    ack?: boolean;
    download?: boolean;
    upload?: boolean;
    encrypted?: boolean;
    noise?: boolean;
    keyPair?: { publicKey: Buffer; secretKey: Buffer };
    onauthenticate?: (remotePublicKey: Buffer, cb: () => void) => void;
    onfeedauthenticate?: (feed: Hypercore, remotePublicKey: Buffer, cb: () => void) => void;
    maxRequests?: number;
  };

  /**
   * https://github.com/hypercore-protocol/hypercore/tree/v9.12.0#feedstats
   */
  export type Stats = {
    peers: Stats[];
    totals: {
      uploadedBytes: number;
      uploadedBlocks: number;
      downloadedBytes: number;
      downloadedBlocks: number;
    };
  };

  /**
   * Bi-directional custom message path for non-feed data exchange.
   * https://github.com/hypercore-protocol/hypercore/tree/v9.12.0#ext--feedregisterextensionname-handlers
   */
  export interface StreamExtension {
    // Send message to extension handler on other side.
    send: (message: Buffer, peer: Buffer) => void;

    // Send message to every peer.
    broadcast: (message: Buffer) => void;

    // Destroy and unregister from stream.
    destroy: () => void;
  }

  interface StreamExtensionHandlers<T> {
    encoding?: ValueEncoding<T>;
    onmessage?: (message: Buffer, peer: Buffer) => any;
    onerror?: (error: any) => any;
  }

  /**
   * https://github.com/hypercore-protocol/hypercore/tree/v9.12.0#var-feed--hypercorestorage-key-options
   */
  export type HypercoreOptions = {
    sparse?: boolean; // do not mark the entire feed to be downloaded
    createIfMissing?: boolean;
    keyPair?: { publicKey: Buffer; secretKey: Buffer };
    valueEncoding?: ValueEncoding;
    crypto?: Crypto;
    writable?: boolean;
    stats?: boolean;
  };

  export interface HypercoreBitfield {
    data: any; // sparse-bitfield package

    total(start: number, end: number): number;

    // TODO(dmaretskyi): More props.
  }

  export interface RangeInit {
    start: number
    end: number
    blocks?: number[]
    linear?: boolean
  }

  export interface Range extends RangeInit {
    done(): Promise<void>;
  }

  /**
   * Raw hypercore feed.
   * https://docs.holepunch.to/building-blocks/hypercore (v10)
   */
  export class Hypercore<T> extends EventEmitter {
    // https://docs.holepunch.to/building-blocks/hypercore#const-core-new-hypercore-storage-key-options
    constructor(
      storage: string | ((filename: string) => RandomAccessStorage),
      key?: Buffer | string,
      options?: HypercoreOptions,
    );

    // Formerly from Nanoresource.
    readonly opening: boolean;
    readonly opened: boolean; // Once opened this stays true.
    readonly closing: boolean;
    readonly closed: boolean; // Cannot be re-opened after closed.

    // https://github.com/hypercore-protocol/hypercore/tree/v9.12.0#feedwritable
    readonly writable: boolean;

    // https://github.com/hypercore-protocol/hypercore/tree/v9.12.0#feedreadable
    readonly readable: boolean;

    // https://github.com/hypercore-protocol/hypercore/tree/v9.12.0#feedkey
    readonly key: Buffer;

    // https://github.com/hypercore-protocol/hypercore/tree/v9.12.0#feedkey
    readonly secretKey: Buffer;

    // https://github.com/hypercore-protocol/hypercore/tree/v9.12.0#discoveryKey
    readonly discoveryKey: Buffer;

    // https://github.com/hypercore-protocol/hypercore/tree/v9.12.0#feedlength
    readonly length: number;

    // https://github.com/hypercore-protocol/hypercore/tree/v9.12.0#feedbytelength
    readonly byteLength: number;

    // https://github.com/hypercore-protocol/hypercore/tree/v9.12.0#feedpeers
    readonly peers: {
      publicKey: Buffer;
    };

    // https://github.com/hypercore-protocol/hypercore/tree/v9.12.0#feedstats
    readonly stats: Stats;

    bitfield?: HypercoreBitfield;

    readonly sparse: boolean;

    // TODO(burdon): Migration to v10
    //  - https://github.com/holepunchto/hypercore/blob/main/index.js
    //  - open removed.
    //  - async now supprted.

    // Close feed.
    async close(err?: Error);

    // Alias for open.
    async ready(): Promise<void>;

    // https://github.com/hypercore-protocol/hypercore/tree/v9.12.0#feedappenddata-callback
    append(data: T | T[]): Promise<{ length: number, byteLength: number }>;

    // https://github.com/hypercore-protocol/hypercore/tree/v9.12.0#var-stream--feedcreatereadstreamoptions
    createReadStream(options?: ReadStreamOptions): Readable;

    // https://github.com/hypercore-protocol/hypercore/tree/v9.12.0#var-stream--feedcreatewritestreamopts
    createWriteStream(options?: WriteStreamOptions): Writable;

    // https://github.com/hypercore-protocol/hypercore/tree/v9.12.0#var-stream--feedreplicateisinitiator-options
    replicate(initiator: boolean, options?: ReplicationOptions): ProtocolStream;

    // https://github.com/hypercore-protocol/hypercore/tree/v9.12.0#feeddestroystoragecallback
    destroyStorage(cb: Callback<{ valid: number; invalid: number }>): void;

    // https://github.com/hypercore-protocol/hypercore/tree/v9.12.0#feedauditcallback
    audit(cb: Callback<{ valid: number; invalid: number }>): void;

    // https://github.com/hypercore-protocol/hypercore/tree/v9.12.0#var-bool--feedhasindex
    has(index: number): void;
    has(start: number, end?: number): boolean;

    // https://github.com/holepunchto/hypercore/tree/v9.12.0#feedclearstart-end-callback
    clear(start: number, end?: number, cb?: Callback<void>): void;

    // https://github.com/hypercore-protocol/hypercore/tree/v9.12.0#feedheadoptions-callback
    /** @deprecated remove in v10 */
    head(options: any, cb: Callback<T>): void;
    head(cb: Callback<T>): void;

    // https://github.com/hypercore-protocol/hypercore/tree/v9.12.0#const-id--feedgetindex-options-callback
    get(index: number, options: GetOptions, cb: Callback<T>): void;
    get(index: number, cb: Callback<T>): void;

    // https://github.com/hypercore-protocol/hypercore/tree/v9.12.0#feedgetbatchstart-end-options-callback
    /** @deprecated remove in v10 */
    getBatch(start: number, end: number, options?: GetOptions, cb?: Callback<T[]>): void;

    // TODO(burdon): Documented signature is different from code.
    // https://github.com/hypercore-protocol/hypercore/tree/v9.12.0#const-id--feeddownloadrange-callback
    download(range?: RangeInit): Range;

    // https://github.com/hypercore-protocol/hypercore/tree/v9.12.0#var-number--feeddownloadedstart-end
    downloaded(start?: number, end?: number): boolean;

    // https://github.com/hypercore-protocol/hypercore/tree/v9.12.0#feedundownloaddownloadid
    undownload(id: number): void;

    // Define custom messages paths (unrelated to hypercore exchange), which are multiplexed on the stream.
    // https://github.com/hypercore-protocol/hypercore-protocol#stream-message-extensions
    registerExtension(name: string, handlers?: StreamExtensionHandlers<T>): StreamExtension;

    // https://github.com/holepunchto/hypercore/tree/v9.12.0#feedsetdownloadingbool
    setDownloading(bool): void;

    // TODO(dmaretskyi): Add other events.
    on(event: string, cb: (...args: any) => void): void;
    on(event: 'download', cb: (index: number, data: any) => void): void;
  }

  export default Hypercore;
}
