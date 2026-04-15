//
// Copyright 2025 DXOS.org
//

import React from 'react';

export type ProfileSummaryProps = {
  summary?: string;
  onOpen?: () => void;
  classNames?: string;
};

export const ProfileSummary = ({ summary, onOpen, classNames }: ProfileSummaryProps) => {
  return (
    <div className={classNames}>
      {summary ? (
        <button onClick={onOpen} className='text-left w-full'>
          <p className='text-sm text-description whitespace-pre-wrap line-clamp-4'>{summary}</p>
        </button>
      ) : (
        <p className='text-sm text-description italic'>No user profile yet.</p>
      )}
    </div>
  );
};
