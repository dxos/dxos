//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { useTranslation } from '@dxos/react-ui';
import { Card } from '@dxos/react-ui-mosaic';
import { type Event } from '@dxos/types';

import { meta } from '../../meta';

export type RelatedEventsProps = {
  recent: Event.Event[];
  upcoming: Event.Event[];
  onEventClick?: (event: Event.Event) => void;
};

export const RelatedEvents = ({ recent, upcoming, onEventClick }: RelatedEventsProps) => {
  const { t } = useTranslation(meta.id);

  return (
    <>
      {recent.length > 0 ? (
        <>
          <Card.Heading variant='subtitle'>{t('recent events title')}</Card.Heading>
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
        </>
      ) : null}
      {upcoming.length > 0 ? (
        <>
          <Card.Heading variant='subtitle'>{t('upcoming events title')}</Card.Heading>
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
        </>
      ) : null}
    </>
  );
};
