//
// Copyright 2025 DXOS.org
//

import { useSpace } from '@dxos/react-client/echo';

import { getActiveSpaceId } from '../../active-space';
import { useLayout } from './useLayout';

export const useActiveSpace = () => {
  const layout = useLayout();
  const spaceId = getActiveSpaceId(layout.workspace);
  return useSpace(spaceId);
};
