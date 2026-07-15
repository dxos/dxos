//
// Copyright 2026 DXOS.org
//

import * as Context from 'effect/Context';

import { Identity } from '@dxos/halo';

import { useHaloServices } from './useHaloServices';
import { useReactive } from './useReactive';

/**
 * Returns the devices belonging to the local identity. Reactive. Replaces
 * `@dxos/react-client`'s `useDevices`.
 */
export const useDevices = (): readonly Identity.DeviceInfo[] => {
  const service = Context.get(useHaloServices(), Identity.Service);
  return useReactive(service.devices, service.deviceChanges, [service]);
};
