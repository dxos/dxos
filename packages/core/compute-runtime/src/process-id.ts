//
// Copyright 2026 DXOS.org
//

import { Process } from '@dxos/functions';

export type ProcessIdGenerator = () => Process.ID;

/**
 * Generates a random process id (UUID string).
 */
export const UUIDProcessIdGenerator: ProcessIdGenerator = () => Process.ID.make(crypto.randomUUID());

/**
 * Generates sequential string process ids (`0`, `1`, …); useful in tests.
 */
export const SequentialProcessIdGenerator: ProcessIdGenerator = (() => {
  let nextId = 0;
  return () => Process.ID.make(String(nextId++));
})();
