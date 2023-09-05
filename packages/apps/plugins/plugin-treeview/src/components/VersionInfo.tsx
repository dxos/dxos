//
// Copyright 2023 DXOS.org
//

import React, { FC } from 'react';

import { PoweredByDXOS } from './PoweredByDXOS';
import { VersionLabel, VersionLabelProps } from './VersionLabel';
import { Config } from '@dxos/react-client';

// TODO(burdon): Factor out.
export const VersionInfo: FC<{ config: Config }> = ({ config }) => {
  const { version, timestamp, commitHash } = config.values.runtime?.app?.build ?? {};
  const handleOpen = () => {
    const prod = config.values.runtime?.app?.env?.DX_ENVIRONMENT !== 'development';
    const repo = 'https://github.com/dxos/dxos';
    const url = prod ? `${repo}/releases/tag/v${version}` : `${repo}/commit/${commitHash}`;
    window.open(url, 'dxos');
  };

  // export const VersionInfo2 = (props: VersionLabelProps) => {
  return (
    <div className='flex items-center p-2 gap-2 font-thin text-xs text-neutral-500'>
      <div className='flex w-full gap-2'>
        <VersionLabel {...{ version, timestamp, commitHash }} />
        <div role='none' className='grow' />
        <PoweredByDXOS />
      </div>
    </div>
  );
};
