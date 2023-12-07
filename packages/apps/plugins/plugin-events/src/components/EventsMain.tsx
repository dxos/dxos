//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { type Calendar as CalendarType, Event as EventType } from '@braneframe/types';
import { getSpaceForObject, useQuery } from '@dxos/react-client/echo';
import { Main } from '@dxos/react-ui';
import { baseSurface, fixedInsetFlexLayout, topbarBlockPaddingStart, mx } from '@dxos/react-ui-theme';

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
  const space = getSpaceForObject(calendar);
  const objects = useQuery(space, EventType.filter());
  objects.sort(byDate());

  return (
    <Main.Content classNames={[baseSurface, fixedInsetFlexLayout, topbarBlockPaddingStart]}>
      <div className={mx('flex flex-col grow overflow-hidden')}>
        <div className={mx('flex flex-col overflow-y-scroll gap-1 px-2', styles.columnWidth)}>
          {objects.map((object) => (
            <div key={object.id} className='flex flex-col p-1 px-2 border border-neutral-100 rounded-md'>
              <div>{object.name}</div>
              <div>{object.owner.email}</div>
              <div className='flex flex-col'>
                {object.attendees.map(({ email }, i) => (
                  <div key={i} className='text-xs text-neutral-500'>
                    {email}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className='p-2 text-xs'>{objects?.length}</div>
      </div>
    </Main.Content>
  );
};
