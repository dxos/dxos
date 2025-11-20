//
// Copyright 2023 DXOS.org
//

import { format, intervalToDuration } from 'date-fns';
import React from 'react';

import { IconButton, useTranslation } from '@dxos/react-ui';

import { meta } from '../../meta';

export const DateComponent = ({ start, end }: { start: Date; end?: Date }) => {
  const { t } = useTranslation(meta.id);
  let { hours = 0, minutes = 0 } = (end && intervalToDuration({ start, end })) ?? {};
  // Prefer 90m over 1h 30m.
  if (hours === 1 && minutes !== 0) {
    hours = 0;
    minutes += 60;
  }
  const duration = [hours > 0 && `${hours}h`, minutes > 0 && `${minutes}m`].filter(Boolean).join(' ');

  return (
    <div className='flex items-center gap-2 overflow-hidden whitespace-nowrap'>
      <IconButton
        variant='ghost'
        icon='ph--calendar--duotone'
        iconOnly
        size={4}
        label={t('open calendar button')}
        classNames='cursor-pointer text-subdued !p-0'
      />
      <div className='truncate text-description'>{format(start, 'PPp')}</div>
      {(hours || minutes) && <div className='text-description text-xs'>({duration})</div>}
    </div>
  );
};
