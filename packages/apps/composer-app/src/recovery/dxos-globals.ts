//
// Copyright 2026 DXOS.org
//

import { type DevtoolsHook, mountDevtoolsHooks } from '@dxos/client/devtools';

/** Static devtools globals only — no Client until {@link bootRecoveryClient}. */
export const installDxosGlobals = (): DevtoolsHook => {
  mountDevtoolsHooks({});
  return getDxos();
};

export const getDxos = (): DevtoolsHook => {
  const dxos = (globalThis as { dxos?: DevtoolsHook }).dxos;
  if (!dxos) {
    throw new Error('dxos globals not installed');
  }
  return dxos;
};

export type RecoveryHelpers = {
  booted: () => boolean;
  boot: () => Promise<unknown>;
  exportSqlite: () => Promise<{ byteLength: number }>;
  reset: () => Promise<void>;
  log: (message: string) => void;
  status: () => Record<string, unknown>;
};

export const attachRecoveryHelpers = (helpers: RecoveryHelpers): void => {
  const dxos = getDxos() as DevtoolsHook & { recovery?: RecoveryHelpers };
  dxos.recovery = helpers;
};
