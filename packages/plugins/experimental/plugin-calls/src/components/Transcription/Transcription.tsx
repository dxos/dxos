//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import { formatDistanceToNow } from 'date-fns/formatDistanceToNow';
import React, { type FC } from 'react';

import { IconButton, useTranslation } from '@dxos/react-ui';

import { CALLS_PLUGIN } from '../../meta';
import { type TranscriptionBlock } from '../../types';

// TODO(burdon): react-ui-list.
// TODO(burdon): Create mock data.
// TODO(burdon): Actions (e.g., mark, summarize, translate, label, delete).

export const TranscriptionList: FC<{ blocks?: TranscriptionBlock[] }> = ({ blocks }) => {
  const { t } = useTranslation(CALLS_PLUGIN);

  return (
    <div role='list' className='flex flex-col grow gap-2'>
      {blocks?.map((block) => (
        <div
          role='listitem'
          key={block.id}
          className='flex flex-col border border-transparent hover:border-separator rounded'
        >
          <div className='group flex items-center justify-between'>
            <div className='p-2 text-sm'>{block.author}</div>
            <IconButton
              icon='ph--x--regular'
              label={t('button delete')}
              iconOnly
              size={4}
              classNames='p-1 transition-opacity duration-250 opacity-10 group-hover:opacity-100'
            />
          </div>

          {block.segments.map((segment, i) => (
            <div key={i} className='flex flex-col p-2 gap-1'>
              <div className='flex gap-1 items-center justify-between'>
                <IconButton
                  icon='ph--bookmark-simple--regular'
                  label={t('button bookmark')}
                  iconOnly
                  size={4}
                  classNames='p-1'
                />
                <div className='grow truncate text-xs text-subdued'>
                  {formatDistanceToNow(segment.timestamp, { addSuffix: true })}
                </div>
              </div>
              <div>{segment.text}</div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};
