//
// Copyright 2022 DXOS.org
//

import type { Hypercore, HypercoreProperties, ReplicationOptions } from 'hypercore';
import type { ProtocolStream } from 'hypercore-protocol';
import type { NanoresourceProperties } from 'nanoresource';
import pify from 'pify';
import type { Readable, Writable } from 'streamx';

/**
 * Wrapped Hypercore.
 */
export interface HypercoreFeed extends NanoresourceProperties, HypercoreProperties {
  readonly native: Hypercore

  // Nanoresource
  /** @deprecated remove in v10 */
  open (): Promise<void>
  close (): Promise<void>
  on (event: string, cb: (...args: any) => void): void
  off (event: string, cb: (...args: any) => void): void

  // Hypercore
  /** @deprecated remove in v10 (becomes property) */
  ready (): Promise<void>
  append (data: string | Buffer | (string | Buffer)[]): Promise<void>
  /** @deprecated remove in v10 */
  flush (): Promise<void>
  createReadStream (options?: any): Readable
  createWriteStream (options?: any): Writable
  replicate (initiator: boolean, options?: ReplicationOptions): ProtocolStream
  head (options?: any): Promise<any>
  get (index: number, options?: any): Promise<Buffer>
  /** @deprecated remove in v10 */
  getBatch (start: number, end: number, options?: any): Promise<Buffer[]>
  download (range?: any): Promise<number>
  downloaded (start: number, end: number): boolean
  undownload (id: number): void
}

/**
 * Wrap async methods.
 */
export const wrapFeed = (feed: Hypercore): HypercoreFeed => {
  // TODO(burdon): Could create issues if overwrite methods.
  // TODO(burdon): Reconcile with pifyFields.
  return Object.assign(feed, {
    native: feed,

    open: pify(feed.open).bind(feed),
    close: pify(feed.close).bind(feed),
    append: pify(feed.append).bind(feed),
    flush: pify(feed.flush).bind(feed),
    head: pify(feed.head).bind(feed),
    get: pify(feed.get).bind(feed),
    getBatch: pify(feed.getBatch).bind(feed),
    download: pify(feed.download).bind(feed)
  }) as any as HypercoreFeed;
};
