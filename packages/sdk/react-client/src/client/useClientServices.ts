//
// Copyright 2022 DXOS.org
//

import { useContext } from 'react';

import type { ClientServices } from '@dxos/client';
import { raise } from '@dxos/debug';

import { ClientContext } from './ClientContext';

export const useClientServices = (): ClientServices | undefined => {
  const { services } = useContext(ClientContext) ?? raise(new Error('Missing ClientContext.'));
  return services;
};
