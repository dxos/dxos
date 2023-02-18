//
// Copyright 2023 DXOS.org
//

import React from 'react';
import { useOutletContext } from 'react-router-dom';

import type { Space } from '@dxos/client';

export const SpacePage = () => {
  const { space } = useOutletContext<{ space: Space }>();

  return <>{space.key.toHex()}</>;
};
