//
// Copyright 2023 DXOS.org
//

import formatDistance from 'date-fns/formatDistance';
import React from 'react';

export type VersionLabelProps = {
  version?: string;
  timestamp?: string;
  commitHash?: string;
};

export const VersionLabel = (props: VersionLabelProps) => {
  const { version, timestamp, commitHash } = props;
  return (
    <a
      className='text-xs text-neutral-500 dark:hover:text-neutral-200 hover:text-neutral-700'
      href={`https://github.com/dxos/dxos/commit/${commitHash}`}
      target='_blank'
      rel='noreferrer'
    >
      <span className='font-mono'>{version ? 'v' + version : ''}</span>{' '}
      {timestamp ? formatDistance(new Date(timestamp), new Date(), { addSuffix: true }) : null}
    </a>
  );
};
