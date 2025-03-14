//
// Copyright 2025 DXOS.org
//

import { type DXN } from '@dxos/keys';

/**
 * Client-side view onto an EDGE queue.
 */
export type Queue<T = object> = {
  dxn: DXN;
  items: T[];
  isLoading: boolean;
  error: Error | null;
  append(items: T[]): void;
  delete(ids: string[]): void;
};
