//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { DeployedTimestamp } from './DeployedTimestamp';
import { PoweredByDXOS } from './PoweredByDXOS';
import { VersionLabel, VersionLabelProps } from './VersionLabel';

export type VersionInfoProps = VersionLabelProps & { timestamp?: string; className?: string };

export const VersionInfo = (props: VersionInfoProps) => {
  const { className, ...rest } = props;
  return (
    <div className={'flex flex-col items-center p-2 gap-2 ' + (className ?? '')}>
      <div className='flex justify-between'>
        <VersionLabel className='pie-2' {...rest} />
        <DeployedTimestamp timestamp={props.timestamp} />
      </div>
      <PoweredByDXOS />
    </div>
  );
};
