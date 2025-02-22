//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import { formatDistanceToNow } from 'date-fns/formatDistanceToNow';
import React, { type FC } from 'react';

import { IconButton } from '@dxos/react-ui';

import { type TranscriptionBlock } from '../../types';

// TODO(burdon): react-ui-list.
// TODO(burdon): Create mock data.
// TODO(burdon): Actions (e.g., mark, summarize, translate, label, delete).

export const TranscriptionList: FC<{ blocks?: TranscriptionBlock[] }> = ({ blocks }) => {
  return (
    <div role='list' className='flex flex-col grow gap-2'>
      {blocks?.map((block) => (
        <div
          role='listitem'
          key={block.id}
          className='flex flex-col border border-separator divide-y divide-separator rounded'
        >
          <div className='p-2 text-sm'>{block.author}</div>
          {block.segments.map((segment, i) => (
            <div key={i} className='flex flex-col p-2 gap-1 group'>
              <div className='flex items-center justify-between'>
                <div className='truncate text-xs text-subdued'>
                  {formatDistanceToNow(segment.timestamp, { addSuffix: true })}
                </div>
                <IconButton
                  icon='ph--x--regular'
                  label='delete'
                  iconOnly
                  size={4}
                  classNames='!p-1 opacity-0 group-hover:opacity-100'
                />
              </div>
              <div>{segment.text}</div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};
