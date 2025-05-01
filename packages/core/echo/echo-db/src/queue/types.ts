//
// Copyright 2025 DXOS.org
//

import { type BaseEchoObject } from '@dxos/echo-schema';
import { type DXN } from '@dxos/keys';

/**
 * Client-side view onto an EDGE queue.
 */
export type Queue<T extends BaseEchoObject = BaseEchoObject> = {
  dxn: DXN;
  items: T[]; // TODO(burdon): Make readonly.
  isLoading: boolean;
  error: Error | null;
  append(items: T[]): void;
  delete(ids: string[]): void;

  /**
   * Refreshes the queue from the server.
   */
  // TODO(dmaretskyi): Remove.
  refresh(): Promise<void>;
};
