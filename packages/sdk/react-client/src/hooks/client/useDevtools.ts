//
// Copyright 2022 DXOS.org
//

import { useContext } from 'react';

import { raise } from '@dxos/debug';
import { DevtoolsHost } from '@dxos/protocols/proto/dxos/devtools/host';

import { ClientContext } from '../client';

export const useDevtools = (): DevtoolsHost | undefined => {
  const { services } = useContext(ClientContext) ?? raise(new Error('Missing ClientContext.'));
  return services?.DevtoolsHost;
};
