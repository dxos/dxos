//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { List, ListItem } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';
import { type Event } from '@dxos/types';

export type EventListProps = {
  events?: Event.Event[];
  selected?: string;
  onSelect?: (contact: Event.Event) => void;
};

export const EventList = ({ events = [], selected, onSelect }: EventListProps) => {
  return (
    <div className={mx('flex is-full overflow-y-auto')}>
      <List classNames={mx('is-full divide-y divide-separator')}>
        {events.map((event) => (
          <ListItem.Root
            key={event.id}
            // TODO(burdon): Change bg-activeSurface to use data-active
            classNames={mx(
              'flex flex-col cursor-pointer hover:bg-hoverSurface',
              selected === event.id && 'bg-activeSurface',
            )}
            onClick={() => onSelect?.(event)}
          >
            {event.name && <ListItem.Heading classNames='p-2'>{event.name}</ListItem.Heading>}
            {/* TODO(burdon): Link to contact records. */}
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
