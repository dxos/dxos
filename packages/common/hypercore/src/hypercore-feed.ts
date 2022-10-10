//
// Copyright 2022 DXOS.org
//

import pify from 'pify';
import { Readable, Writable } from 'streamx';

import type {
  FeedProperties,
  FeedReplicationOptions,
  HypercoreFeedObject,
  NanoresourceProperties,
  ProtocolStream
} from './types';

/**
 * Wrapped HypercoreFeedObject.
 */
export interface HypercoreFeed extends NanoresourceProperties, FeedProperties {
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
  replicate (initiator: boolean, options?: FeedReplicationOptions): ProtocolStream
  head (options?: any): Promise<any>
  get (index: number, options?: any): Promise<any>
  /** @deprecated remove in v10 */
  getBatch (start: number, end: number, options?: any): Promise<any[]>
  download (range?: any): Promise<number>
  downloaded (start: number, end: number): boolean
  undownload (id: number): void
}

/**
 * Wrap async methods.
 */
export const wrapFeed = (feed: HypercoreFeedObject): HypercoreFeed => {
  return Object.assign(feed, {
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
