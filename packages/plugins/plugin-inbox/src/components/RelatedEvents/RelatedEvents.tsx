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
              <Next.Card.Action
                key={event.id}
                onClick={() => onEventClick?.(event)}
                label={event.title ?? event.description!}
                icon='ph--calendar-dot--regular'
                actionIcon='ph--arrow-right--regular'
              />
            ))}
        </Next.Card.Section>
      ) : null}
      {upcoming.length > 0 ? (
        <Next.Card.Section title={t('upcoming-events.title')}>
          {upcoming
            .filter((event) => event.title || event.description)
            .map((event) => (
              <Next.Card.Action
                key={event.id}
                onClick={() => onEventClick?.(event)}
                label={event.title ?? event.description!}
                icon='ph--calendar-dot--regular'
                actionIcon='ph--arrow-right--regular'
              />
            ))}
        </Next.Card.Section>
      ) : null}
    </>
  );
};
