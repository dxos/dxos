//
// Copyright 2023 DXOS.org
//

import React from 'react';

export type ProgressBarProps = {
  indeterminate?: boolean;
  progress?: number;
  className?: string;
};

// TODO(burdon): Move to react-ui?
export const ProgressBar = (props: ProgressBarProps) => {
  const { className, indeterminate = false, progress = 0 } = props;
  return (
    <span
      role='none'
      className={'w-20 h-1 inline-block relative bg-neutral-400/25 rounded-full' + (className ? ' ' + className : '')}
    >
      <span
        className={
          'absolute left-0 top-0 bottom-0 inline-block bg-neutral-400 rounded-full' +
          (indeterminate ? ' animate-progress-indeterminate' : '')
        }
        {...(indeterminate ? {} : { style: { width: `${(progress * 100).toFixed(0)}%` } })}
      />
    </span>
  );
};
