//
// Copyright 2026 DXOS.org
//

// #region app
import React from 'react';

import * as Button from '@dxos/react-ui/Button';
import * as Layout from '@dxos/react-ui/Layout';

export const App = () => (
  <Layout.Flex gap='sm'>
    <Button.Root variant='primary' icon='ph--plus--regular' label='Add contact' />
    <Button.Root>Import</Button.Root>
  </Layout.Flex>
);
// #endregion
