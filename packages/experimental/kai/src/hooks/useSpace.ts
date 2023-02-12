//
// Copyright 2023 DXOS.org
//

import { useParams } from 'react-router-dom';

import { Space } from '@dxos/client';
import { useSpaces } from '@dxos/react-client';

export const useSpace = (): Space | undefined => {
  const spaces = useSpaces();
  const { spaceKey } = useParams();
  return spaceKey ? spaces.find((space) => space.key.truncate() === spaceKey) : undefined;
};
