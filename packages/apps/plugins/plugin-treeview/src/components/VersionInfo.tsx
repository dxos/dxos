//
// Copyright 2023 DXOS.org
//

import format from 'date-fns/format';
import React, { FC } from 'react';

import { Config } from '@dxos/react-client';

// TODO(burdon): Factor out.
// TODO(burdon): Link to product home page.
export const VersionInfo: FC<{ config: Config }> = ({ config }) => {
  const { version, timestamp, commitHash } = config.values.runtime?.app?.build ?? {};
  const handleOpen = () => {
    window.open(`https://github.com/dxos/dxos/commit/${commitHash}`, 'commit');
  };
  return (
    <div className='flex p-2 gap-2 font-mono text-xs text-neutral-500'>
      <div className='flex cursor-pointer gap-2' onClick={handleOpen}>
        <span>v{version}</span>
        {timestamp && <span>({format(new Date(timestamp), 'MMM dd')})</span>}
      </div>
    </div>
  );
};
