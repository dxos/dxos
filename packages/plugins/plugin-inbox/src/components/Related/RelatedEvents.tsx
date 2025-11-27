//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Button, Icon, useTranslation } from '@dxos/react-ui';
import { Card, cardText } from '@dxos/react-ui-stack';
import { mx } from '@dxos/react-ui-theme';
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
          <h3 className={mx(cardText, 'text-xs text-description uppercase font-medium')}>{t('recent events title')}</h3>
          <Card.Chrome>
            {recent.map((event) => (
              <Button
                key={event.id}
                classNames='font-normal gap-2 mbe-1 last:mbe-0'
                onClick={() => onEventClick?.(event)}
              >
                <Icon icon='ph--calendar-dot--regular' classNames='mli-0.5' />
                <p className='min-is-0 flex-1 truncate'>{event.title}</p>
                <Icon icon='ph--arrow-right--regular' />
              </Button>
            ))}
          </Card.Chrome>
        </>
      ) : null}
      {upcoming.length > 0 ? (
        <>
          <h3 className={mx(cardText, 'text-xs text-description uppercase font-medium')}>
            {t('upcoming events title')}
          </h3>
          <Card.Chrome>
            {upcoming.map((event) => (
              <Button
                key={event.id}
                classNames='font-normal gap-2 mbe-1 last:mbe-0'
                onClick={() => onEventClick?.(event)}
              >
                <Icon icon='ph--calendar-dot--regular' classNames='mli-0.5' />
                <p className='min-is-0 flex-1 truncate'>{event.title}</p>
                <Icon icon='ph--arrow-right--regular' />
              </Button>
            ))}
          </Card.Chrome>{' '}
        </>
      ) : null}
    </>
  );
};
