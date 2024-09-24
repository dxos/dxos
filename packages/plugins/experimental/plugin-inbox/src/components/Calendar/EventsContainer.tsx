//
// Copyright 2023 DXOS.org
//

import React, { useState } from 'react';

import { Filter, getSpace, useQuery } from '@dxos/react-client/echo';
import { mx } from '@dxos/react-ui-theme';

import { EventList } from './EventtList';
import { type CalendarType, EventType } from '../../types';
import { MasterDetail } from '../MasterDetail';

const byDate =
  (direction = -1) =>
  ({ startDate: a }: EventType, { startDate: b }: EventType) =>
    a < b ? -direction : a > b ? direction : 0;

export type EventsContainerProps = {
  calendar: CalendarType;
};

export const EventsContainer = ({ calendar }: EventsContainerProps) => {
  const [selected, setSelected] = useState<EventType>();
  const space = getSpace(calendar);
  const objects = useQuery(space, Filter.schema(EventType));
  objects.sort(byDate());

  return (
    <div role='none' className={mx('flex row-span-2')}>
      <MasterDetail>
        <EventList events={objects} selected={selected?.id} onSelect={setSelected} />
      </MasterDetail>
    </div>
  );
};
