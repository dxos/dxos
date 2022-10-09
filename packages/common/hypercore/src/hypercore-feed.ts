//
// Copyright 2022 DXOS.org
//

import type { NanoresourceProperties } from 'nanoresource';

import type { FeedProperties, FeedReplicationOptions } from './types';

/**
 * Wrapped HypercoreFeedObject.
 */
export interface HypercoreFeed extends FeedProperties, NanoresourceProperties {
  // Nanoresource
  open (): Promise<void>
  close (): Promise<void>
  on (event: string, cb: (...args: any) => void): void
  off (event: string, cb: (...args: any) => void): void

  // Hypercore
  ready (): Promise<void>
  append (data: string | Buffer | (string | Buffer)[]): Promise<void>
  flush (): Promise<void>
  createReadStream (options?: any): NodeJS.ReadableStream
  createWriteStream (options?: any): NodeJS.WritableStream
  replicate (initiator: boolean, options?: FeedReplicationOptions): NodeJS.ReadWriteStream
  head (options?: any): Promise<any>
  get (index: number, options?: any): Promise<any>
  getBatch (start: number, end: number, options?: any): Promise<any[]>
  download (range?: any): Promise<number>
  downloaded (start: number, end: number): boolean
  undownload (id: number): void
}
