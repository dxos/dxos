//
// Copyright 2022 DXOS.org
//

import type { NanoresourceProperties } from 'nanoresource';

import { FeedBlock } from './types';
import type { FeedProperties, FeedReplicationOptions } from './types';

/**
 * Wrapped HypercoreFeedObject.
 */
export interface HypercoreFeed extends FeedProperties, NanoresourceProperties {
  open (): Promise<void>
  close (): Promise<void>
  ready (): Promise<void>
  append (data: string | Buffer | (string | Buffer)[]): Promise<void>
  flush (): Promise<void>
  createReadStream (options?: any): NodeJS.ReadableStream
  createWriteStream (options?: any): NodeJS.WritableStream
  replicate (initiator: boolean, options?: FeedReplicationOptions): NodeJS.ReadWriteStream
  head (options?: any): Promise<FeedBlock>
  get (index: number, options?: any): Promise<FeedBlock>
  getBatch (start: number, end: number, options?: any): Promise<FeedBlock[]>
  download (range?: any): Promise<number>
  downloaded (start: number, end: number): boolean
  undownload (id: number): void
}
