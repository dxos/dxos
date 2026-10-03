//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Card, Icon, useTranslation } from '@dxos/react-ui';
import { type Event } from '@dxos/types';

import { meta } from '#meta';

export type RelatedEventsProps = {
  recent: Event.Event[];
  upcoming: Event.Event[];
  onEventClick?: (event: Event.Event) => void;
};

export const RelatedEvents = ({ recent, upcoming, onEventClick }: RelatedEventsProps) => {
  const { t } = useTranslation(meta.profile.key);

  return (
    <>
      {recent.length > 0 ? (
        <Card.Section title={t('recent-events.title')}>
          {recent
            .filter((event) => event.title || event.description)
            .map((event) => (
              <Card.Row
                key={event.id}
                icon='ph--calendar-dot--regular'
                trailing={<Icon icon='ph--arrow-right--regular' />}
                onClick={() => onEventClick?.(event)}
              >
                <Card.Text>{event.title ?? event.description ?? ''}</Card.Text>
              </Card.Row>
            ))}
        </Card.Section>
      ) : null}
      {upcoming.length > 0 ? (
        <Card.Section title={t('upcoming-events.title')}>
          {upcoming
            .filter((event) => event.title || event.description)
            .map((event) => (
              <Card.Row
                key={event.id}
                icon='ph--calendar-dot--regular'
                trailing={<Icon icon='ph--arrow-right--regular' />}
                onClick={() => onEventClick?.(event)}
              >
                <Card.Text>{event.title ?? event.description ?? ''}</Card.Text>
              </Card.Row>
            ))}
        </Card.Section>
      ) : null}
    </>
  );
};
