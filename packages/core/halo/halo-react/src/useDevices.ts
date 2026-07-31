//
// Copyright 2026 DXOS.org
//

import { Atom, Result, useAtomValue } from '@effect-atom/atom-react';
import * as Stream from 'effect/Stream';
import { useMemo } from 'react';

import { Identity } from '@dxos/halo';

import { useHaloServices } from './HaloProvider';

const EMPTY: readonly Identity.DeviceInfo[] = [];

/**
 * Returns the devices belonging to the local identity. Reactive. Replaces
 * `@dxos/react-client`'s `useDevices`.
 */
export const useDevices = (): readonly Identity.DeviceInfo[] => {
  const services = useHaloServices();
  const atom = useMemo(() => Atom.make(Identity.devices.pipe(Stream.provideContext(services))), [services]);
  return Result.getOrElse(useAtomValue(atom), () => EMPTY);
};
