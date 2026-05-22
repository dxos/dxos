//
// Copyright 2024 DXOS.org
//

import React from 'react';

import VersionNumber from '../VersionNumber';

export type StatusBarActionsProps = {};

export const StatusBarActions = (_props: StatusBarActionsProps) => {
  return (
    <div className='h-full flex items-center px-2 gap-2'>
      <VersionNumber />
      <div className='grow' />
      {/* TODO(burdon): Show EDGE service status? */}
    </div>
  );
};
