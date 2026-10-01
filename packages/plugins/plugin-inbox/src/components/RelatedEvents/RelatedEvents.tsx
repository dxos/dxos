//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { useTranslation } from '@dxos/react-ui';
import { Next } from '@dxos/react-ui/next';
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
        <Next.Card.Section title={t('recent-events.title')}>
          {recent
            .filter((event) => event.title || event.description)
            .map((event) => (
              <Next.Card.Row
                key={event.id}
                icon='ph--calendar-dot--regular'
                trailing={<Next.Icon icon='ph--arrow-right--regular' />}
                onClick={() => onEventClick?.(event)}
              >
                <Next.Card.Text>{event.title ?? event.description ?? ''}</Next.Card.Text>
              </Next.Card.Row>
            ))}
        </Next.Card.Section>
      ) : null}
      {upcoming.length > 0 ? (
        <Next.Card.Section title={t('upcoming-events.title')}>
          {upcoming
            .filter((event) => event.title || event.description)
            .map((event) => (
              <Next.Card.Row
                key={event.id}
                icon='ph--calendar-dot--regular'
                trailing={<Next.Icon icon='ph--arrow-right--regular' />}
                onClick={() => onEventClick?.(event)}
              >
                <Next.Card.Text>{event.title ?? event.description ?? ''}</Next.Card.Text>
              </Next.Card.Row>
            ))}
        </Next.Card.Section>
      ) : null}
    </>
  );
};
