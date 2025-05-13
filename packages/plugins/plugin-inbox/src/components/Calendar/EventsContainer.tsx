//
// Copyright 2023 DXOS.org
//

import React, { useState } from 'react';

import { Filter, getSpace, useQuery } from '@dxos/react-client/echo';
import { StackItem } from '@dxos/react-ui-stack';
import { DataType } from '@dxos/schema';

import { EventList } from './EventtList';
import { type CalendarType } from '../../types';

const byDate =
  (direction = -1) =>
  ({ startDate: a }: DataType.Event, { startDate: b }: DataType.Event) =>
    a < b ? -direction : a > b ? direction : 0;

export type EventsContainerProps = {
  calendar: CalendarType;
};

export const EventsContainer = ({ calendar }: EventsContainerProps) => {
  const [selected, setSelected] = useState<DataType.Event>();
  const space = getSpace(calendar);
  const objects = useQuery(space, Filter.schema(DataType.Event));
  objects.sort(byDate());

  return (
    <StackItem.Content>
      <EventList events={objects} selected={selected?.id} onSelect={setSelected} />
    </StackItem.Content>
  );
};
