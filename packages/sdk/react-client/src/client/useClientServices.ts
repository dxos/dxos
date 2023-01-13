//
// Copyright 2022 DXOS.org
//

import { useContext } from 'react';

import { ClientServices } from '@dxos/client-services';
import { raise } from '@dxos/debug';

import { ClientContext } from './ClientContext';

export const useClientServices = (): ClientServices | undefined => {
  const { services } = useContext(ClientContext) ?? raise(new Error('Missing ClientContext.'));
  return services;
};
