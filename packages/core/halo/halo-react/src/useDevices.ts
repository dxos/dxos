//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import * as Stream from 'effect/Stream';
import * as Result from 'effect/unstable/reactivity/AsyncResult';
import * as Atom from 'effect/unstable/reactivity/Atom';
import { useMemo } from 'react';

import { Identity } from '@dxos/halo';

import { useHaloServices } from './HaloProvider.tsx';

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
