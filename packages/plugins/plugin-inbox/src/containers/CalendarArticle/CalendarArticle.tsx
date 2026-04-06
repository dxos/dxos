//
// Copyright 2023 DXOS.org
//

import { isSameDay } from 'date-fns';
import React, { useCallback } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { companionSegment, LayoutOperation } from '@dxos/app-toolkit';
import { type ObjectSurfaceProps, useLayout } from '@dxos/app-toolkit/ui';
import { type Feed, Obj, Query } from '@dxos/echo';
import { AttentionOperation } from '@dxos/plugin-attention/operations';
import { DeckOperation } from '@dxos/plugin-deck/operations';
import { Filter, useObject, useQuery } from '@dxos/react-client/echo';
import { Panel, Toolbar, useTranslation } from '@dxos/react-ui';
import { useSelected } from '@dxos/react-ui-attention';
import { Calendar as NaturalCalendar } from '@dxos/react-ui-calendar';
import { Event } from '@dxos/types';

import { EventStack, type EventStackActionHandler } from '#components';
import { meta } from '#meta';
import { type Calendar } from '#types';

import { NewCalendar } from './NewCalendar';

const byDate =
  (direction = -1) =>
  ({ startDate: a }: Event.Event, { startDate: b }: Event.Event) =>
    a < b ? -direction : a > b ? direction : 0;

export type CalendarArticleProps = ObjectSurfaceProps<Calendar.Calendar> & { attendableId?: string };

export const CalendarArticle = ({ role, subject: calendar, attendableId }: CalendarArticleProps) => {
  const { t } = useTranslation(meta.id);
  const { invokePromise } = useOperationInvoker();
  const layout = useLayout();
  const id = attendableId ?? Obj.getDXN(calendar).toString();
  const currentId = useSelected(id, 'single');
  const db = Obj.getDatabase(calendar);

  // TODO(wittjosiah): Should be `const feed = useObjectValue(calendar.feed)`.
  useObject(calendar);
  const feed = calendar.feed?.target as Feed.Feed | undefined;
  const events = useQuery(
    db,
    feed ? Query.select(Filter.type(Event.Event)).from(feed) : Query.select(Filter.nothing()),
  ).toSorted(byDate());

  // TODO(burdon): Actual test should be if we have synced; not number of messages.
  const isEmpty = events.length === 0;

  const handleDateSelect = useCallback(
    ({ date }: { date: Date }) => {
      const match = events.find((event) => isSameDay(new Date(event.startDate), date));
      if (match) {
        void invokePromise(AttentionOperation.Select, {
          contextId: id,
          selection: { mode: 'single', id: match.id },
        });
      }
    },
    [events, id, invokePromise],
  );

  const handleAction = useCallback<EventStackActionHandler>(
    (action) => {
      switch (action.type) {
        case 'current': {
          void invokePromise(AttentionOperation.Select, {
            contextId: id,
            selection: { mode: 'single', id: action.eventId },
          });

          const companion = companionSegment('event');
          if (layout.mode === 'simple') {
            void invokePromise(LayoutOperation.UpdateComplementary, {
              subject: companion,
              state: 'expanded',
            });
          } else {
            void invokePromise(DeckOperation.ChangeCompanion, {
              companion,
            });
          }
          break;
        }
      }
    },
    [id, invokePromise, layout.mode],
  );

  return (
    <div role={role} className='@container dx-container overflow-hidden'>
      <div role='none' className='grid grid-cols-1 @3xl:grid-cols-[min-content_1fr] h-full'>
        <Panel.Root className='hidden @3xl:block'>
          <NaturalCalendar.Root>
            <Panel.Toolbar asChild>
              <NaturalCalendar.Toolbar />
            </Panel.Toolbar>
            <Panel.Content asChild>
              <NaturalCalendar.Grid
                dates={events.map((event) => new Date(event.startDate))}
                onSelect={handleDateSelect}
              />
            </Panel.Content>
          </NaturalCalendar.Root>
        </Panel.Root>

        <Panel.Root>
          <Panel.Toolbar asChild>
            <Toolbar.Root />
          </Panel.Toolbar>
          <Panel.Content asChild>
            {isEmpty ? (
              <NewCalendar calendar={calendar} />
            ) : (
              <EventStack id={id} events={events} currentId={currentId} onAction={handleAction} />
            )}
          </Panel.Content>
        </Panel.Root>
      </div>
    </div>
  );
};
