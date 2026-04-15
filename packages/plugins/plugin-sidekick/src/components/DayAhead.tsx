//
// Copyright 2025 DXOS.org
//

import React from 'react';

export type DayAheadProps = {
  summary?: string;
  classNames?: string;
};

export const DayAhead = ({ summary, classNames }: DayAheadProps) => {
  return (
    <div className={classNames}>
      {summary ? (
        <p className='text-sm text-description whitespace-pre-wrap'>{summary}</p>
      ) : (
        <p className='text-sm text-description italic'>No journal entry for today.</p>
      )}
    </div>
  );
};
