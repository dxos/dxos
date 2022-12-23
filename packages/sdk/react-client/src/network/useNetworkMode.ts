//
// Copyright 2020 DXOS.org
//

import { useState } from 'react';

import { GetNetworkModeResponse } from '@dxos/protocols/proto/dxos/client/services';
import { useAsyncEffect } from '@dxos/react-async';

import { useClient } from '../client';

export const useNetworkMode = () => {
  const client = useClient();
  const [networkMode, setNetworkMode] = useState<GetNetworkModeResponse>();

  useAsyncEffect(async () => {
    setNetworkMode(await client.networkMode);
  }, [client.networkMode]);

  return networkMode;
};
