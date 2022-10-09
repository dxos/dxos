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

import events from 'events';
import type { Nanoresource } from 'nanoresource';

import { Callback, RandomAccessFileConstructor } from '@dxos/random-access-storage';

/**
 * Feed data block.
 */
export type FeedBlock = {
  seq: number
  data: Buffer
}

/**
 * Download range.
 */
export type Range = {
  start: number
  end: number
  linear: boolean
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
export type FeedReplicationOptions = {
  live: boolean
}

/**
 * Shared property definitions for raw and wrapped objects.
 */
export interface FeedProperties {

  // https://github.com/hypercore-protocol/hypercore/tree/v9.12.0#feedwritable
  readonly writable: boolean

  // https://github.com/hypercore-protocol/hypercore/tree/v9.12.0#feedreadable
  readonly readable: boolean

  // https://github.com/hypercore-protocol/hypercore/tree/v9.12.0#feedkey
  readonly key: Buffer

  // https://github.com/hypercore-protocol/hypercore/tree/v9.12.0#discoveryKey
  readonly discoveryKey: Buffer

  // https://github.com/hypercore-protocol/hypercore/tree/v9.12.0#feedlength
  readonly length: number

  // https://github.com/hypercore-protocol/hypercore/tree/v9.12.0#feedbytelength
  readonly byteLength: number

  // https://github.com/hypercore-protocol/hypercore/tree/v9.12.0#feedpeers
  readonly peers: Buffer[]

  // https://github.com/hypercore-protocol/hypercore/tree/v9.12.0#feedstats
  readonly stats: any
}

/**
 * Raw hypercore feed.
 * https://github.com/hypercore-protocol/hypercore/blob/v9.12.0/index.js#L53
 */
// TODO(burdon): Update full list of methods.
export interface HypercoreFeedObject extends Nanoresource, FeedProperties, events.EventEmitter {

  // Alias for open.
  ready (cb?: Callback<void>): void

  // https://github.com/hypercore-protocol/hypercore/tree/v9.12.0#feedappenddata-callback
  append (data: string | Buffer | (string | Buffer)[], cb: Callback<number>): void

  // Undocumented.
  flush (cb?: Callback<void>): void

  // https://github.com/hypercore-protocol/hypercore/tree/v9.12.0#var-stream--feedcreatereadstreamoptions
  createReadStream (options?: any): NodeJS.ReadableStream

  // https://github.com/hypercore-protocol/hypercore/tree/v9.12.0#var-stream--feedcreatewritestreamopts
  createWriteStream (options?: any): NodeJS.WritableStream

  // https://github.com/hypercore-protocol/hypercore/tree/v9.12.0#var-stream--feedreplicateisinitiator-options
  replicate (initiator: boolean, options?: FeedReplicationOptions): NodeJS.ReadWriteStream

  // https://github.com/hypercore-protocol/hypercore/tree/v9.12.0#feedheadoptions-callback
  head (options?: any, cb?: Callback<FeedBlock>): void

  // https://github.com/hypercore-protocol/hypercore/tree/v9.12.0#const-id--feedgetindex-options-callback
  get (index: number, options: any, cb: Callback<FeedBlock>): void

  // https://github.com/hypercore-protocol/hypercore/tree/v9.12.0#feedgetbatchstart-end-options-callback
  getBatch (start: number, end: number, options: any, cb: Callback<FeedBlock[]>): void

  // https://github.com/hypercore-protocol/hypercore/tree/v9.12.0#const-id--feeddownloadrange-callback
  download (range?: Range, cb?: Callback<number>): any

  // https://github.com/hypercore-protocol/hypercore/tree/v9.12.0#var-number--feeddownloadedstart-end
  downloaded (start: number, end: number): boolean

  // https://github.com/hypercore-protocol/hypercore/tree/v9.12.0#feedundownloaddownloadid
  undownload (id: number): void
}

// Default constructor.
// https://github.com/hypercore-protocol/hypercore/tree/v9.12.0#var-feed--hypercorestorage-key-options
export type HypercoreFeedConstructor = (
  storage: RandomAccessFileConstructor,
  key?: Buffer | string,
  options?: FeedOptions
) => HypercoreFeedObject
