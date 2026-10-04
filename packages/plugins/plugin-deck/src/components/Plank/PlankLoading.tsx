//
// Copyright 2026 DXOS.org
//

import React from 'react';

import * as Layout from '@dxos/react-ui/Layout';

// TODO(burdon): Show skeleton: https://github.com/dxos/dxos/issues/8259
/** Stands in for a surface's content while it is on its way. */
export const PlankLoading = () => <Layout.Flex center classNames='dx-attention-surface' />;

PlankLoading.displayName = 'PlankLoading';
