//
// Copyright 2023 DXOS.org
//

import React, { useState } from 'react';

import { type CalendarType, EventType } from '@braneframe/types';
import { Filter, getSpaceForObject, useQuery } from '@dxos/react-client/echo';
import { Main } from '@dxos/react-ui';
import { baseSurface, fixedInsetFlexLayout, topbarBlockPaddingStart } from '@dxos/react-ui-theme';

import { EventList } from './EventtList';
import { MasterDetail } from '../MasterDetail';

// TODO(burdon): Factor out.
export const styles = {
  selected: '!bg-primary-100 dark:!bg-primary-700',
  columnWidth: 'max-w-[400px]',
};

const byDate =
  (direction = -1) =>
  ({ startDate: a }: EventType, { startDate: b }: EventType) =>
    a < b ? -direction : a > b ? direction : 0;

export type EventsMainProps = {
  calendar: CalendarType;
};

const EventsMain = ({ calendar }: EventsMainProps) => {
  const [selected, setSelected] = useState<EventType>();
  const space = getSpaceForObject(calendar);
  const objects = useQuery(space, Filter.schema(EventType));
  objects.sort(byDate());

  return (
    <Main.Content classNames={[baseSurface, fixedInsetFlexLayout, topbarBlockPaddingStart]}>
      <MasterDetail>
        <EventList events={objects} selected={selected?.id} onSelect={setSelected} />
      </MasterDetail>
    </Main.Content>
  );
};

export default EventsMain;
