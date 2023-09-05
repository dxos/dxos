//
// Copyright 2023 DXOS.org
//


import React from 'react';

export type VersionLabelProps = {
  className?: string;
  version?: string;
  commitHash?: string;
};

// const handleOpen = () => {
//   const prod = config.values.runtime?.app?.env?.DX_ENVIRONMENT !== 'development';
//   const repo = 'https://github.com/dxos/dxos';
//   const url = prod ? `${repo}/releases/tag/v${version}` : `${repo}/commit/${commitHash}`;
//   window.open(url, 'dxos');
// };

export const VersionLabel = (props: VersionLabelProps) => {
  const { version, commitHash, className } = props;
  return (
    <a
      className={'text-xs text-neutral-500 dark:hover:text-neutral-200 hover:text-neutral-700 ' + (className ?? '')}
      href={`https://github.com/dxos/dxos/commit/${commitHash}`}
      target='_blank'
      rel='noreferrer'
    >
      <span className='font-mono'>{version ? 'v' + version : ''}</span>{' '}
    </a>
  );
};
