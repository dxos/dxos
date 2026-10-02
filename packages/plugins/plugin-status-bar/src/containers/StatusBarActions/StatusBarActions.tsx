//
// Copyright 2024 DXOS.org
//

import React from 'react';

import * as Flex from '@dxos/react-ui/Flex';

import VersionNumber from '../VersionNumber/index.ts';

export type StatusBarActionsProps = {};

export const StatusBarActions = (_props: StatusBarActionsProps) => {
  return (
    <Flex.Root gap='sm' align='center' classNames='h-full px-2'>
      <VersionNumber />
      <div className='grow' />
      {/* TODO(burdon): Show EDGE service status? */}
    </Flex.Root>
  );
};

StatusBarActions.displayName = 'StatusBarActions';
