//
// Copyright 2021 DXOS.org
//
// noinspection SpellCheckingInspection

export type Callback<T> = (err: Error | null, data?: T) => void
export type EventCallback<T> = (data: T) => void

export type Block = {
  seq: number
  data: Buffer
}

export type Hypercore = (storage: any, key?: any, options?: any) => HypercoreFeed;

/**
 * https://hypercore-protocol.org
 * https://www.npmjs.com/package/hypercore/v/9.12.0
 * https://github.com/hypercore-protocol/hypercore/tree/v9.12.0
 * NOTE: This closedly follows (but is not the same as) the RandomAccessFile typpe.
 */
export interface HypercoreFeed {
  closed: boolean
  discoveryKey: Buffer
  head: any
  key: Buffer
  length: number
  opened: boolean
  readable: boolean
  ready: any
  secretKey: Buffer

  /**
   * Appends a block of data to the feed.
   * Callback is called with (err, seq) when all data has been written at the returned seq number or error will be not null.
   * https://github.com/hypercore-protocol/hypercore/tree/v9.12.0#feedappenddata-callback
   */
  append (data: any, cb?: Callback<number>): void

  close (cb?: NodeJS.ErrnoException): void

  createReadStream (options?: any): NodeJS.ReadableStream

  download (options: any): any
  downloaded (start: number, end: number): boolean

  // TODO(burdon): Flush isn't used?
  flush (cb?: NodeJS.ErrnoException): void

  /**
   * Gets a block of data.
   * If the data is not available locally this method will prioritize and wait for the data to be downloaded before calling the callback.
   */
  get (index: number, cb: Callback<Block>): void

  /**
   * Get a block of data.
   * If the data is not available locally this method will prioritize and wait for the data to be downloaded before calling the callback.
   */
  get (index: number, options: any, cb: Callback<Block>): void

  getBatch (start: number, end: number, ...args: any[]): any

  /**
   * Events.
   * https://github.com/hypercore-protocol/hypercore/tree/v9.12.0#feedonready
   */
  on (event: string, cb: EventCallback<any>): any

  removeListener (event: string, cb: EventCallback<any>): any

  replicate (initiator: boolean): NodeJS.ReadWriteStream

  undownload (range: any): void
}
