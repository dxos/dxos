//
// Copyright 2022 DXOS.org
//

import { useContext } from 'react';
import { invariant } from '@dxos/invariant';

import { DevtoolsHost } from '@dxos/client/devtools';
import { raise } from '@dxos/debug';

import { ClientContext } from '../client';

export const useDevtools = (): DevtoolsHost => {
  const { services } = useContext(ClientContext) ?? raise(new Error('Missing ClientContext.'));
  invariant(services);
  return services.DevtoolsHost;
};
