//
// Copyright 2022 DXOS.org
//

import { type DevtoolsHost } from '@dxos/client/devtools';
import { raise } from '@dxos/debug';

import { useClient } from '../client';

export const useDevtools = (): DevtoolsHost => {
  const client = useClient();
  return (client.services.services.DevtoolsHost ?? raise(new Error('DevtoolsHost not available.'))) as never;
};
