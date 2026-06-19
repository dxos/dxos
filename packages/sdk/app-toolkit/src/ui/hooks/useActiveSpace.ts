//
// Copyright 2025 DXOS.org
//

import { useSpace } from '@dxos/react-client/echo';

import { AppSpace } from '../../echo';
import { useLayout } from './useLayout';

export const useActiveSpace = () => {
  const layout = useLayout();
  const spaceId = AppSpace.getActiveSpaceId(layout.workspace);
  return useSpace(spaceId);
};
