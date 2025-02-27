//
// Copyright 2023 DXOS.org
//

import { formatDistanceToNow } from 'date-fns/formatDistanceToNow';
import React, { type FC } from 'react';

import { Icon, IconButton, useTranslation } from '@dxos/react-ui';

import { TRANSCRIPTION_PLUGIN } from '../../meta';
import { type TranscriptBlock } from '../../types';

// TODO(burdon): react-ui-list.
// TODO(burdon): Actions (e.g., mark, summarize, translate, label, delete).

export type TranscriptionProps = {
  blocks?: TranscriptBlock[];
};

export const Transcription: FC<TranscriptionProps> = ({ blocks }) => {
  const { t } = useTranslation(TRANSCRIPTION_PLUGIN);
  const hoverButton = 'p-1 min-bs-1 transition-opacity duration-250 opacity-10 group-hover:opacity-100';

  return (
    <div role='list' className='flex flex-col grow gap-2 m-1'>
      {blocks?.map((block) => (
        <div
          role='listitem'
          key={block.id}
          className='flex flex-col py-1 border border-transparent hover:border-separator rounded'
        >
          <div className='group flex items-center px-2'>
            <Icon icon='ph--user--regular' />
            <div className='px-2 text-sm text-subdued'>{block.author}</div>
            <div className='grow' />
            <IconButton
              disabled
              icon='ph--x--regular'
              label={t('delete button')}
              iconOnly
              size={4}
              classNames={hoverButton}
            />
          </div>

          {block.segments.map((segment, i) => (
            <div key={i} className='group flex flex-col'>
              <div className='px-2'>{segment.text}</div>
              <div className='flex gap-1 items-center justify-between px-2'>
                <div className='grow' />
                <div className='truncate text-xs text-subdued'>
                  {formatDistanceToNow(segment.started, { addSuffix: true })}
                </div>
                <IconButton
                  disabled
                  icon='ph--bookmark-simple--regular'
                  label={t('bookmark button')}
                  iconOnly
                  size={4}
                  classNames={hoverButton}
                />
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};
