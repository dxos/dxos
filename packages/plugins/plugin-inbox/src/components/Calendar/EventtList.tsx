//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { List, ListItem } from '@dxos/react-ui';
import { attentionSurface, ghostHover, groupBorder, mx } from '@dxos/react-ui-theme';
import { type DataType } from '@dxos/schema';

export type EventListProps = {
  events?: DataType.Event[];
  selected?: string;
  onSelect?: (contact: DataType.Event) => void;
};

export const EventList = ({ events = [], selected, onSelect }: EventListProps) => (
  <div className={mx('flex w-full overflow-y-scroll', attentionSurface)}>
    <List classNames={mx('w-full divide-y', groupBorder)}>
      {events.map((event) => (
        <ListItem.Root
          key={event.id}
          // TODO(burdon): Change bg-activeSurface to use data-active
          classNames={mx('flex flex-col cursor-pointer', ghostHover, selected === event.id && 'bg-activeSurface')}
          onClick={() => onSelect?.(event)}
        >
          {event.name && <ListItem.Heading classNames='p-2'>{event.name}</ListItem.Heading>}
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
