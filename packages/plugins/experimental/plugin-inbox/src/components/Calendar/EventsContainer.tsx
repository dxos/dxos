//
// Copyright 2023 DXOS.org
//

import React, { useState } from 'react';

import { Filter, getSpace, useQuery } from '@dxos/react-client/echo';
import { StackItem } from '@dxos/react-ui-stack';

import { EventList } from './EventtList';
import { type CalendarType, EventType } from '../../types';

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
    <StackItem.Content toolbar={false}>
      <EventList events={objects} selected={selected?.id} onSelect={setSelected} />
    </StackItem.Content>
  );
};
