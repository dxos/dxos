//
// Copyright 2021 DXOS.org
//

import React from 'react';

import { Next } from '@dxos/react-ui';

// TODO(burdon): Use theme.
export const BooleanIcon = ({ value }: { value: boolean | undefined }) => (
  <Next.Icon icon={value ? 'ph--check--regular' : 'ph--stop--regular'} />
);
