//
// Copyright 2022 DXOS.org
//

import { NetworkMode } from '@dxos/protocols/proto/dxos/client/services';

import { useClientServices } from '../client';
import { useStream } from '../util';

export const useNetworkMode = () => {
  const services = useClientServices();

  if (!services) {
    return;
  }

  const value = useStream(() => services.NetworkService.getNetworkMode(), { mode: NetworkMode.ONLINE }, [services]);
  return value;
};
