//
// Copyright 2022 DXOS.org
//

import assert from 'node:assert';
import { useContext } from 'react';

import { raise } from '@dxos/debug';
import { DevtoolsHost } from '@dxos/protocols/proto/dxos/devtools/host';

import { ClientContext } from './ClientContext';

export const useDevtools = (): DevtoolsHost => {
  const { services } = useContext(ClientContext) ?? raise(new Error('Missing ClientContext.'));
  assert(services);
  return services.DevtoolsHost;
};
