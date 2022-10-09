//
// Copyright 2022 DXOS.org
//

import * as Nanoresource from 'nanoresource';

import type { FeedProperties } from './types';

/**
 * Pify wrapped Hypercore object.
 */
export interface HypercoreFeed extends FeedProperties, Nanoresource {
  open (): Promise<void>

  append (data: string | Buffer | (string | Buffer)[]): Promise<void>
}
