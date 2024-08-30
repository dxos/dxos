//
// Copyright 2023 DXOS.org
//

import React, { useState } from 'react';

import { Filter, getSpace, useQuery } from '@dxos/react-client/echo';
import { Main } from '@dxos/react-ui';
import {
  baseSurface,
  bottombarBlockPaddingEnd,
  fixedInsetFlexLayout,
  topbarBlockPaddingStart,
} from '@dxos/react-ui-theme';

import { EventList } from './EventtList';
import { type CalendarType, EventType } from '../../types';
import { MasterDetail } from '../MasterDetail';

const byDate =
  (direction = -1) =>
  ({ startDate: a }: EventType, { startDate: b }: EventType) =>
    a < b ? -direction : a > b ? direction : 0;

export type EventsMainProps = {
  calendar: CalendarType;
};

const EventsMain = ({ calendar }: EventsMainProps) => {
  const [selected, setSelected] = useState<EventType>();
  const space = getSpace(calendar);
  const objects = useQuery(space, Filter.schema(EventType));
  objects.sort(byDate());

  return (
    <Main.Content classNames={[baseSurface, fixedInsetFlexLayout, topbarBlockPaddingStart, bottombarBlockPaddingEnd]}>
      <MasterDetail>
        <EventList events={objects} selected={selected?.id} onSelect={setSelected} />
      </MasterDetail>
    </Main.Content>
  );
};

export default EventsMain;
