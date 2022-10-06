//
// Copyright 2021 DXOS.org
//
// noinspection SpellCheckingInspection

// TODO(burdon): Block?
export interface Message {
  seq: number
  data: Buffer
}

export type Hypercore = (storage: any, key?: any, options?: any) => HypercoreFeed;

/**
 * https://hypercore-protocol.org
 * https://www.npmjs.com/package/hypercore/v/9.12.0
 * https://github.com/hypercore-protocol/hypercore/tree/v9.12.0
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
   */
  append (data: any, callback?: (err: Error | null, seq?: number) => void): void

  close (arg: any): any

  createReadStream (options?: any): NodeJS.ReadableStream

  download (options: any): any
  downloaded (start: number, batchEnd: number): boolean

  /**
   * Gets a block of data.
   * If the data is not available locally this method will prioritize and wait for the data to be downloaded before calling the callback.
   */
  get (index: number, callback: (err: Error | null, data?: Message) => void): void

  /**
   * Get a block of data.
   * If the data is not available locally this method will prioritize and wait for the data to be downloaded before calling the callback.
   */
  get (index: number, options: any, callback: (err: Error | null, data?: Message) => void): void

  getBatch (n: number, maxMessages: number, ...args: any[]): any

  on (event: string, cb: () => any): any

  removeListener (s: string, cb: () => any): any

  replicate (isInitiator: boolean): NodeJS.ReadWriteStream

  undownload (args: any): void
}
