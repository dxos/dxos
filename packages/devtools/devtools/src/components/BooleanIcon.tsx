//
// Copyright 2021 DXOS.org
//

import React from 'react';

import * as Icon from '@dxos/react-ui/Icon';

// TODO(burdon): Use theme.
export const BooleanIcon = ({ value }: { value: boolean | undefined }) => (
  <Icon.Icon icon={value ? 'ph--check--regular' : 'ph--stop--regular'} />
);
