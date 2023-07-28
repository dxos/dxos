//
// Copyright 2022 DXOS.org
//

import { useContext } from 'react';

import type { SystemStatus } from '@dxos/client/services';
import { raise } from '@dxos/debug';

import { ClientContext } from './ClientContext';

export const useStatus = (): SystemStatus | null | undefined => {
  const { status } = useContext(ClientContext) ?? raise(new Error('Missing ClientContext.'));
  return status;
};
