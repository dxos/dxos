//
// Copyright 2022 DXOS.org
//

import { Channel } from './channel';

export type CleanupCb = undefined | (() => void);

export class Muxer {
  public readonly stream: NodeJS.ReadWriteStream;

  constructor() {}

  createChannel(tag: string, onOpen: (channel: Channel) => CleanupCb) {}

  /**
   * Graceful close.
   */
  finalize() {}

  /**
   * Force-close with optional error.
   */
  destroy(err?: Error) {}
}
