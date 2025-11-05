//
// Copyright 2023 DXOS.org
//

import React, { useState } from 'react';

import { Filter, getSpace, useQuery } from '@dxos/react-client/echo';
import { StackItem } from '@dxos/react-ui-stack';
import { DataType } from '@dxos/schema';

import { type Calendar } from '../../types';

import { EventList } from './EventtList';

const byDate =
  (direction = -1) =>
  ({ startDate: a }: DataType.Event.Event, { startDate: b }: DataType.Event.Event) =>
    a < b ? -direction : a > b ? direction : 0;

export type EventsContainerProps = {
  calendar: Calendar.Calendar;
};

export const EventsContainer = ({ calendar }: EventsContainerProps) => {
  const [selected, setSelected] = useState<DataType.Event.Event>();
  const space = getSpace(calendar);
  const objects = useQuery(space, Filter.type(DataType.Event.Event));
  objects.sort(byDate());

  return (
    <StackItem.Content>
      <EventList events={objects} selected={selected?.id} onSelect={setSelected} />
    </StackItem.Content>
  );
};
