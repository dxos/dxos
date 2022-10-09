//
// Copyright 2022 DXOS.org
//

import type { FeedProperties } from 'hypercore';
import * as Nanoresource from 'nanoresource';

/**
 * Pify wrapped Hypercore object.
 */
export interface HypercoreFeed extends FeedProperties, Nanoresource {
  open (): Promise<void>

  append (data: string | Buffer | (string | Buffer)[]): Promise<void>
}
