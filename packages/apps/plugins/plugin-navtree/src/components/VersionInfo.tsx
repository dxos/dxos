//
// Copyright 2023 DXOS.org
//

import { formatDistance } from 'date-fns/formatDistance';
import React, { type FC } from 'react';

import { type Config } from '@dxos/react-client';
import { Tooltip } from '@dxos/react-ui';
import { warningText, infoText, chromeText } from '@dxos/react-ui-theme';

// TODO(burdon): Factor out.
export const VersionInfo: FC<{ config: Config }> = ({ config }) => {
  const { version, timestamp, commitHash } = config.values.runtime?.app?.build ?? {};
  const handleOpen = () => {
    const prod = config.values.runtime?.app?.env?.DX_ENVIRONMENT !== 'development';
    const repo = 'https://github.com/dxos/dxos';
    const url = prod ? `${repo}/releases/tag/v${version}` : `${repo}/commit/${commitHash}`;
    window.open(url, 'dxos');
  };

  return (
    <div className='flex items-center pli-4 p-2 gap-2 font-thin text-xs text-neutral-500'>
      <div className='flex w-full gap-2'>
        <span
          title={timestamp && formatDistance(new Date(timestamp), new Date(), { addSuffix: true })}
          className='font-mono cursor-pointer'
          onClick={handleOpen}
        >
          v{version}
        </span>
        <Tooltip.Provider>
          <Tooltip.Root delayDuration={0}>
            <Tooltip.Trigger asChild>
              <a
                className='font-mono cursor-pointer'
                href='https://docs.dxos.org/composer#technology-preview'
                target='_blank'
                rel='noreferrer'
              >
                BETA
              </a>
            </Tooltip.Trigger>
            <Tooltip.Content side='top'>
              <Tooltip.Arrow />
              <a
                className='flex flex-col max-w-40 text-center'
                href='https://docs.dxos.org/composer#technology-preview'
                target='_blank'
                rel='noreferrer'
              >
                <span className={infoText}>Technology preview.</span>
                <span className={warningText}>Data loss may occur.</span>
                <span className={chromeText}>Click to learn more.</span>
              </a>
            </Tooltip.Content>
          </Tooltip.Root>
        </Tooltip.Provider>
        <div role='none' className='grow' />
        <span>
          Powered by{' '}
          <a
            href='https://dxos.org'
            target='_blank'
            className='font-normal hover:text-neutral-700 hover:dark:text-neutral-200'
            rel='noreferrer'
          >
            DXOS
          </a>
        </span>
      </div>
    </div>
  );
};
