//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { type EventType } from '@braneframe/types';
import { List, ListItem } from '@dxos/react-ui';
import { ghostHover, groupBorder, attentionSurface, mx } from '@dxos/react-ui-theme';

import { styles } from '../styles';

export type EventListProps = {
  events?: EventType[];
  selected?: string;
  onSelect?: (contact: EventType) => void;
};

export const EventList = ({ events = [], selected, onSelect }: EventListProps) => {
  return (
    <div className={mx('flex w-full overflow-y-scroll', attentionSurface)}>
      <List classNames={mx('w-full divide-y', groupBorder)}>
        {events.map((event) => (
          <ListItem.Root
            key={event.id}
            classNames={mx('flex flex-col cursor-pointer', ghostHover, selected === event.id && styles.selected)}
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
