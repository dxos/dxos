//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { Flex } from '@dxos/react-ui';

import VersionNumber from '../VersionNumber/index.ts';

export type StatusBarActionsProps = {};

export const StatusBarActions = (_props: StatusBarActionsProps) => {
  return (
    <Flex gap='sm' align='center' classNames='h-full px-2'>
      <VersionNumber />
      <div className='grow' />
      {/* TODO(burdon): Show EDGE service status? */}
    </Flex>
  );
};

StatusBarActions.displayName = 'StatusBarActions';
