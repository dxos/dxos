//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { Flex } from '@dxos/react-ui';

// TODO(burdon): Show skeleton: https://github.com/dxos/dxos/issues/8259
/** A plank whose subject has not arrived. */
export const PlankLoading = () => <Flex center classNames='dx-attention-surface' />;

PlankLoading.displayName = 'PlankLoading';
