//
// Copyright 2022 DXOS.org
//

import { useClient } from '../client';

export const useDevtools = () => {
  const client = useClient();
  return client.services.DevtoolsHost;
};
