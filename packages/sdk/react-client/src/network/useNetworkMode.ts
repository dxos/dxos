//
// Copyright 2020 DXOS.org
//

import { useState } from 'react';

import { GetNetworkModeResponse } from '@dxos/protocols/proto/dxos/client/services';
import { useAsyncEffect } from '@dxos/react-async';

import { useClient } from '../client';

// TODO(burdon): Not required -- coudld just call client.networkMode.
export const useNetworkMode = () => {
  const client = useClient();
  const [networkMode, setNetworkMode] = useState<GetNetworkModeResponse>();

  useAsyncEffect(async () => {
    setNetworkMode(await client.networkMode); // TODO(burdon): Review required for API changes. E.g., client.mesh.props.
  }, [client.networkMode]);

  return networkMode;
};
