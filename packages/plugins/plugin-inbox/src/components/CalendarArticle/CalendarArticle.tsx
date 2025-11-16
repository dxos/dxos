//
// Copyright 2023 DXOS.org
//

import React, { useState } from 'react';

import { type SurfaceComponentProps } from '@dxos/app-framework/react';
import { Filter, getSpace, useQuery } from '@dxos/react-client/echo';
import { Toolbar, useTranslation } from '@dxos/react-ui';
import { Calendar as NaturalCalendar } from '@dxos/react-ui-calendar';
import { StackItem } from '@dxos/react-ui-stack';
import { Event } from '@dxos/types';

import { meta } from '../../meta';
import { type Calendar } from '../../types';

import { EventList } from './EventList';

const byDate =
  (direction = -1) =>
  ({ startDate: a }: Event.Event, { startDate: b }: Event.Event) =>
    a < b ? -direction : a > b ? direction : 0;

export const CalendarArticle = ({ subject: calendar }: SurfaceComponentProps<Calendar.Calendar>) => {
  const { t } = useTranslation(meta.id);
  const [selected, setSelected] = useState<Event.Event>();
  const space = getSpace(calendar);
  const queue = space?.queues.get(calendar.queue.dxn);
  const objects = useQuery(queue, Filter.type(Event.Event));
  objects.sort(byDate());

  return (
    <StackItem.Content classNames='@container overflow-hidden'>
      <div role='none' className='grid @2xl:grid-cols-[min-content_1fr] overflow-hidden'>
        <div role='none' className='hidden @2xl:flex'>
          <NaturalCalendar.Root>
            <NaturalCalendar.Viewport classNames='grid grid-rows-[var(--toolbar-size)_1fr]'>
              <NaturalCalendar.Toolbar classNames='bs-full border-be border-subduedSeparator' />
              <NaturalCalendar.Grid />
            </NaturalCalendar.Viewport>
          </NaturalCalendar.Root>
        </div>

        {/* TODO(burdon): Create grid-rows fragment for toolbar grid. */}
        <div role='none' className='grid grid-rows-[var(--toolbar-size)_1fr] overflow-hidden'>
          <Toolbar.Root classNames='border-be border-subduedSeparator'>
            <Toolbar.IconButton icon='ph--calendar--duotone' iconOnly variant='ghost' label={t('calendar')} />
          </Toolbar.Root>
          <EventList events={objects} selected={selected?.id} onSelect={setSelected} />
        </div>
      </div>
    </StackItem.Content>
  );
};
