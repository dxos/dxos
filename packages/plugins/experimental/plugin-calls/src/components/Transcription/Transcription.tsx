//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import React, { type FC } from 'react';

import { type TranscriptionBlock } from '../../types';

// TODO(burdon): react-ui-list.
// TODO(burdon): Create mock data.
// TODO(burdon): Actions (e.g., mark, summarize, translate, label, delete).

export const TranscriptionList: FC<{ blocks?: TranscriptionBlock[] }> = ({ blocks }) => {
  return (
    <div role='list' className='flex flex-col grow gap-2'>
      {blocks?.map((block) => (
        <div role='listitem' key={block.id} className='flex flex-col p-2 gap-2 border border-separator rounded'>
          {block.segments.map((segment, i) => (
            <div key={i}>
              <div className='truncate text-xs text-subdued'>{String(segment.timestamp)}</div>
              <div>{segment.text}</div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};
