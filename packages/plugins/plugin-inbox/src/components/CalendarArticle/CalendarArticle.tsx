//
// Copyright 2023 DXOS.org
//

import React, { useState } from 'react';

import { type SurfaceComponentProps } from '@dxos/app-framework/react';
import { Filter, getSpace, useQuery } from '@dxos/react-client/echo';
import { Calendar as NaturalCalendar } from '@dxos/react-ui-calendar';
import { StackItem } from '@dxos/react-ui-stack';
import { Event } from '@dxos/types';

import { type Calendar } from '../../types';

import { EventList } from './EventList';

const byDate =
  (direction = -1) =>
  ({ startDate: a }: Event.Event, { startDate: b }: Event.Event) =>
    a < b ? -direction : a > b ? direction : 0;

export const CalendarArticle = ({ object }: SurfaceComponentProps<Calendar.Calendar>) => {
  const [selected, setSelected] = useState<Event.Event>();
  const space = getSpace(object);
  const queue = space?.queues.get(object.queue.dxn);
  const objects = useQuery(queue, Filter.type(Event.Event));
  objects.sort(byDate());

  return (
    <StackItem.Content>
      <div role='none' className='grid grid-cols-[min-content_1fr] overflow-hidden'>
        <NaturalCalendar.Root>
          <NaturalCalendar.Viewport>
            <NaturalCalendar.Header />
            <NaturalCalendar.Grid />
          </NaturalCalendar.Viewport>
        </NaturalCalendar.Root>

        {/* TODO(burdon): Integrate into Calendar viewport? */}
        <EventList events={objects} selected={selected?.id} onSelect={setSelected} />
      </div>
    </StackItem.Content>
  );
};
