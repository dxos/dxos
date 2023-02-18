//
// Copyright 2023 DXOS.org
//

import assert from 'assert';
import { useParams } from 'react-router-dom';

import { Space } from '@dxos/client';
import { useSpaces } from '@dxos/react-client';

// TODO(burdon): Reconcile with useFrameState.
export const useSpace = (): Space => {
  const spaces = useSpaces();
  const { spaceKey } = useParams();
  const space = spaces.find((space) => space.key.truncate() === spaceKey);
  assert(space);
  return space;
};
