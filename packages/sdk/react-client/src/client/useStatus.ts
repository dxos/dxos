//
// Copyright 2022 DXOS.org
//

import { useContext } from 'react';

import { Status } from '@dxos/client';
import { raise } from '@dxos/debug';

import { ClientContext } from './ClientContext';

export const useStatus = (): Status | undefined => {
  const { status } = useContext(ClientContext) ?? raise(new Error('Missing ClientContext.'));

  return status;
};
