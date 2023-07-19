//
// Copyright 2022 DXOS.org
//

import assert from 'node:assert';
import { useContext } from 'react';

import { DevtoolsHost } from '@dxos/client/devtools';
import { raise } from '@dxos/debug';

import { ClientContext } from '../client';

export const useDevtools = (): DevtoolsHost => {
  const { services } = useContext(ClientContext) ?? raise(new Error('Missing ClientContext.'));
  assert(services);
  return services.DevtoolsHost;
};
