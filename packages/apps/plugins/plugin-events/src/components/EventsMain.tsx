//
// Copyright 2023 DXOS.org
//

import React, { useState } from 'react';

import { type Calendar as CalendarType, Event as EventType } from '@braneframe/types';
import { getSpaceForObject, useQuery } from '@dxos/react-client/echo';
import { Main } from '@dxos/react-ui';
import { baseSurface, fixedInsetFlexLayout, topbarBlockPaddingStart } from '@dxos/react-ui-theme';

import { EventList } from './EventtList';
import { MasterDetail } from './MasterDetail';

// TODO(burdon): Master detail (same as Inbox); incl. selection, cursor navigation, scrolling.
// TODO(burdon): Nav from inbox.
// TODO(burdon): Show messages for selection.

// TODO(burdon): Create outliner task list re selection.

// TODO(burdon): Select/merge.
// TODO(burdon): Click to research, get image, etc. Scrape LinkedIn?
// TODO(burdon): Tags.

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

export const EventsMain = ({ calendar }: EventsMainProps) => {
  const [selected, setSelected] = useState<EventType>();
  const space = getSpaceForObject(calendar);
  const objects = useQuery(space, EventType.filter());
  objects.sort(byDate());

  return (
    <Main.Content classNames={[baseSurface, fixedInsetFlexLayout, topbarBlockPaddingStart]}>
      <MasterDetail>
        <EventList events={objects} selected={selected?.id} onSelect={setSelected} />
      </MasterDetail>
    </Main.Content>
  );
};
