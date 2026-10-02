//
// Copyright 2025 DXOS.org
//

import React from 'react';

import * as Card from '@dxos/react-ui/Card';
import * as Hooks from '@dxos/react-ui/Hooks';
import { type Event } from '@dxos/types';

import { meta } from '#meta';

export type RelatedEventsProps = {
  recent: Event.Event[];
  upcoming: Event.Event[];
  onEventClick?: (event: Event.Event) => void;
};

export const RelatedEvents = ({ recent, upcoming, onEventClick }: RelatedEventsProps) => {
  const { t } = Hooks.useTranslation(meta.profile.key);

  return (
    <>
      {recent.length > 0 ? (
        <Card.Section title={t('recent-events.title')}>
          {recent
            .filter((event) => event.title || event.description)
            .map((event) => (
              <Card.Action
                key={event.id}
                onClick={() => onEventClick?.(event)}
                label={event.title ?? event.description!}
                icon='ph--calendar-dot--regular'
                actionIcon='ph--arrow-right--regular'
              />
            ))}
        </Card.Section>
      ) : null}
      {upcoming.length > 0 ? (
        <Card.Section title={t('upcoming-events.title')}>
          {upcoming
            .filter((event) => event.title || event.description)
            .map((event) => (
              <Card.Action
                key={event.id}
                onClick={() => onEventClick?.(event)}
                label={event.title ?? event.description!}
                icon='ph--calendar-dot--regular'
                actionIcon='ph--arrow-right--regular'
              />
            ))}
        </Card.Section>
      ) : null}
    </>
  );
};
