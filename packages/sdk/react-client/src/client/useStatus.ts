//
// Copyright 2022 DXOS.org
//

import { useContext } from 'react';

import { raise } from '@dxos/debug';
import { Status } from '@dxos/protocols/proto/dxos/client';

import { ClientContext } from './ClientContext';

export const useStatus = (): Status | undefined => {
  const { status } = useContext(ClientContext) ?? raise(new Error('Missing ClientContext.'));

  return status;
};
