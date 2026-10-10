//
// Copyright 2024 DXOS.org
//

import React from 'react';

import * as Layout from '@dxos/react-ui/Layout';

import VersionNumber from '../VersionNumber/index.ts';

export type StatusBarActionsProps = {};

export const StatusBarActions = (_props: StatusBarActionsProps) => {
  return (
    <Layout.Flex gap='sm' align='center' classNames='h-full px-2'>
      <VersionNumber />
      <div className='grow' />
      {/* TODO(burdon): Show EDGE service status? */}
    </Layout.Flex>
  );
};

StatusBarActions.displayName = 'StatusBarActions';
