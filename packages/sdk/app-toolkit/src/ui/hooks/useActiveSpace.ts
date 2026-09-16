//
// Copyright 2025 DXOS.org
//

import { useSpace } from '@dxos/react-client/echo';

import { AppSpace } from '../../echo/index.ts';
import { useLayout } from './useLayout.ts';

export const useActiveSpace = () => {
  const layout = useLayout();
  const spaceId = AppSpace.getActiveSpaceId(layout.workspace);
  return useSpace(spaceId);
};
