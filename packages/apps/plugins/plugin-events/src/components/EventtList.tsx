//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { type Event as EventType } from '@braneframe/types';
import { List, ListItem } from '@dxos/react-ui';
import { ghostHover, groupBorder, inputSurface, mx } from '@dxos/react-ui-theme';

// TODO(burdon): Factor out.
export const styles = {
  selected: '!bg-primary-100 dark:!bg-primary-700',
};

export type EventListProps = {
  events?: EventType[];
  selected?: string;
  onSelect?: (contact: EventType) => void;
};

export const EventList = ({ events = [], selected, onSelect }: EventListProps) => {
  return (
    <div className={mx('flex w-full overflow-y-scroll', inputSurface)}>
      <List classNames={mx('w-full divide-y', groupBorder)}>
        {events.map((event) => (
          <ListItem.Root
            key={event.id}
            classNames={mx('flex flex-col', ghostHover, selected === event.id && styles.selected)}
            onClick={() => onSelect?.(event)}
          >
            {event.title && <ListItem.Heading classNames='p-2'>{event.title}</ListItem.Heading>}
            <div className='flex flex-col p-2'>
              {event.attendees.map(({ email }) => (
                <div key='value' className='text-sm text-neutral-500'>
                  {email}
                </div>
              ))}
            </div>
          </ListItem.Root>
        ))}
      </List>
    </div>
  );
};
