//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { type JournalType } from '../../types';

export type JournalProps = {
  journal: JournalType;
};

export const Journal = ({ journal }: JournalProps) => {
  console.log('journal', journal);
  return null;
  return (
    <div className='flex flex-col w-full divide-y divide-separator'>
      {journal.entries?.map((entry, i) => (
        <div key={i} className='flex flex-col w-full'>
          {/* <div>{entry.target!.date}</div> */}
          {/* <Outliner text={entry.target!.content} /> */}
        </div>
      ))}
    </div>
  );
};
