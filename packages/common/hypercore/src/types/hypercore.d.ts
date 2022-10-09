//
// Copyright 2021 DXOS.org
//

/**
 * Hypercore Typescript Definitions version 9.12.0
 *
 * https://hypercore-protocol.org (Web)
 * https://www.npmjs.com/package/hypercore/v/9.12.0 (NPM)
 * https://github.com/hypercore-protocol/hypercore/tree/v9.12.0 (Repo)
 * https://github.com/hypercore-protocol/hypercore/blob/v9.12.0/index.js#L53 (Code)
 *
 * Events
 * https://github.com/hypercore-protocol/hypercore/tree/v9.12.0#feedonready
 */
declare module 'hypercore' {
  import events from 'events';
  import * as Hypercore from 'hypercore';
  import Nanoresource from 'nanoerror';

  import RandomAccessFileConstructor from '@dxos/random-access-storage';

  import { Callback } from './callback';

  export type Block = {
    seq: number
    data: Buffer
  }

  /**
   * https://github.com/hypercore-protocol/hypercore/tree/v9.12.0#var-feed--hypercorestorage-key-options
   */
  export type FeedOptions = {
    createIfMissing?: boolean
    secretKey?: Buffer
    valueEncoding?: 'json' | 'utf-8' | 'binary' // defaults to binary
    crypto?: {
      sign: (data: any, secretKey: Buffer, cb: Callback<any>) => void
      verify: (signature: any, data: any, key: Buffer, cb: Callback<boolean>) => void
    }
  }

  /**
   * https://github.com/hypercore-protocol/hypercore/tree/v9.12.0#var-stream--feedreplicateisinitiator-options
   */
  export type ReplicateOptions = {
    live: boolean
  }

  export interface FeedProperties {
    // https://github.com/hypercore-protocol/hypercore/tree/v9.12.0#feedwritable
    writable: boolean

    // https://github.com/hypercore-protocol/hypercore/tree/v9.12.0#feedreadable
    readable: boolean

    // https://github.com/hypercore-protocol/hypercore/tree/v9.12.0#feedkey
    key: Buffer

    // https://github.com/hypercore-protocol/hypercore/tree/v9.12.0#discoveryKey
    discoveryKey: Buffer

    // https://github.com/hypercore-protocol/hypercore/tree/v9.12.0#feedlength
    length: number

    // https://github.com/hypercore-protocol/hypercore/tree/v9.12.0#feedbytelength
    byteLength: number

    // https://github.com/hypercore-protocol/hypercore/tree/v9.12.0#feedpeers
    peers: Buffer[]

    // https://github.com/hypercore-protocol/hypercore/tree/v9.12.0#feedstats
    stats: any
  }

  /**
   * https://github.com/hypercore-protocol/hypercore/blob/v9.12.0/index.js#L53
   */
  // TODO(burdon): Update full list of methods.
  export class Feed extends Nanoresource implements FeedProperties, events.EventEmitter {
    // https://github.com/hypercore-protocol/hypercore/tree/v9.12.0#var-feed--hypercorestorage-key-options
    constructor (storage: RandomAccessFileConstructor, key?: Buffer | string, options?: FeedOptions)

    // Alias for open.
    ready (cb?: Callback<void>): void

    // https://github.com/hypercore-protocol/hypercore/tree/v9.12.0#feedappenddata-callback
    append (data: string | Buffer | (string | Buffer)[], cb: Callback<number>): void

    // https://github.com/hypercore-protocol/hypercore/tree/v9.12.0#var-stream--feedcreatereadstreamoptions
    createReadStream (options?: any): NodeJS.ReadableStream

    // https://github.com/hypercore-protocol/hypercore/tree/v9.12.0#var-stream--feedcreatewritestreamopts
    createWriteStream (options?: any): NodeJS.WritableStream

    // https://github.com/hypercore-protocol/hypercore/tree/v9.12.0#var-stream--feedreplicateisinitiator-options
    replicate (initiator: boolean, options?: ReplicateOptions): NodeJS.ReadWriteStream

    // https://github.com/hypercore-protocol/hypercore/tree/v9.12.0#feedheadoptions-callback
    head (cb: Callback<Block>): void
    head (options?: any, cb: Callback<Block>): void

    // https://github.com/hypercore-protocol/hypercore/tree/v9.12.0#const-id--feedgetindex-options-callback
    get (index: number, cb: Callback<Block>): void
    get (index: number, options: any, cb: Callback<Block>): void

    // https://github.com/hypercore-protocol/hypercore/tree/v9.12.0#feedgetbatchstart-end-options-callback
    getBatch (start: number, end: number, options: any, cb: Callback<Block[]>): void

    // https://github.com/hypercore-protocol/hypercore/tree/v9.12.0#const-id--feeddownloadrange-callback
    download (range?: any, cb?: Callback<number>): any

    // https://github.com/hypercore-protocol/hypercore/tree/v9.12.0#var-number--feeddownloadedstart-end
    downloaded (start: number, end: number): boolean

    // https://github.com/hypercore-protocol/hypercore/tree/v9.12.0#feedundownloaddownloadid
    undownload (id: number): void
  }

  // Default constructor.
  export type Constructor = (storage: RandomAccessFileConstructor, key?: Buffer | string, options?: FeedOptions) => Hypercore
  export const hypercore: Constructor;

  export = hypercore;
}
