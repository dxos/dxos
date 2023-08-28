//
// Copyright 2023 DXOS.org
//

import formatDistance from 'date-fns/formatDistance';
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
    <div className='flex items-center p-2 gap-2 font-thin text-xs text-neutral-500'>
      <div className='flex w-full gap-2'>
        <span
          title={timestamp && formatDistance(new Date(timestamp), new Date(), { addSuffix: true })}
          className='font-mono cursor-pointer'
          onClick={handleOpen}
        >
          v{version}
        </span>
        <div role='none' className='grow' />
        <span>
          Powered by{' '}
          <a
            href='https://dxos.org'
            rel='noreferrer'
            target='_blank'
            className='font-normal hover:text-neutral-700 hover:dark:text-neutral-200'
          >
            DXOS
          </a>
        </span>
      </div>
    </div>
  );
};
