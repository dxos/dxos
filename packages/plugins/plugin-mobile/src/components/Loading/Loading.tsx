//
// Copyright 2024 DXOS.org
//

import React from 'react';

import * as Layout from '@dxos/react-ui/Layout';

// TODO(burdon): Show skeleton: https://github.com/dxos/dxos/issues/8259
export const Loading = () => {
  return <Layout.Grid center classNames='dx-attention-surface' />;
};
