//
// Copyright 2026 DXOS.org
//

import { Result, useAtomValue } from '@effect-atom/atom-react';
import { useMemo } from 'react';

import { Identity } from '@dxos/halo';

import { useHaloRuntime } from './HaloProvider';

const EMPTY: readonly Identity.DeviceInfo[] = [];

/**
 * Returns the devices belonging to the local identity. Reactive. Replaces
 * `@dxos/react-client`'s `useDevices`.
 */
export const useDevices = (): readonly Identity.DeviceInfo[] => {
  const runtime = useHaloRuntime();
  const atom = useMemo(() => runtime.atom(Identity.devices), [runtime]);
  return Result.getOrElse(useAtomValue(atom), () => EMPTY);
};
