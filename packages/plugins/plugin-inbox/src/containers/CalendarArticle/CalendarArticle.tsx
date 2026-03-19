//
// Copyright 2023 DXOS.org
//

import React, { useCallback } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { companionSegment, LayoutOperation } from '@dxos/app-toolkit';
import { type SurfaceComponentProps, useLayout } from '@dxos/app-toolkit/ui';
import { type Feed, Obj, Query } from '@dxos/echo';
import { AttentionOperation } from '@dxos/plugin-attention/types';
import { DeckOperation } from '@dxos/plugin-deck/types';
import { Filter, useObject, useQuery } from '@dxos/react-client/echo';
import { Panel, Toolbar, useTranslation } from '@dxos/react-ui';
import { useSelected } from '@dxos/react-ui-attention';
import { Calendar as NaturalCalendar } from '@dxos/react-ui-calendar';
import { Event } from '@dxos/types';

import { CalendarEmpty, EventList } from '../../components';
import { meta } from '../../meta';
import { type Calendar } from '../../types';

const byDate =
  (direction = -1) =>
  ({ startDate: a }: Event.Event, { startDate: b }: Event.Event) =>
    a < b ? -direction : a > b ? direction : 0;

export type CalendarArticleProps = SurfaceComponentProps<Calendar.Calendar> & { attendableId?: string };

export const CalendarArticle = ({ role, subject: calendar, attendableId }: CalendarArticleProps) => {
  const { t } = useTranslation(meta.id);
  const { invokePromise } = useOperationInvoker();
  const layout = useLayout();
  const id = attendableId ?? Obj.getDXN(calendar).toString();
  const selected = useSelected(id, 'single');
  const db = Obj.getDatabase(calendar);

  // TODO(wittjosiah): Should be `const feed = useObjectValue(calendar.feed)`.
  useObject(calendar);
  const feed = calendar.feed?.target as Feed.Feed | undefined;
  const objects = useQuery(
    db,
    feed ? Query.select(Filter.type(Event.Event)).from(feed) : Query.select(Filter.nothing()),
  ).toSorted(byDate());

  const handleSelect = useCallback(
    (event: Event.Event) => {
      void invokePromise(AttentionOperation.Select, {
        contextId: id,
        selection: { mode: 'single', id: event.id },
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
    },
    [id, invokePromise, layout.mode],
  );

  return (
    <div role={role} className='@container dx-container flex overflow-hidden'>
      <Panel.Root className='hidden @2xl:block w-min shrink-0'>
        <NaturalCalendar.Root>
          <Panel.Toolbar asChild>
            <NaturalCalendar.Toolbar />
          </Panel.Toolbar>
          <Panel.Content asChild>
            <NaturalCalendar.Grid />
          </Panel.Content>
        </NaturalCalendar.Root>
      </Panel.Root>

      <Panel.Root className='grow'>
        <Panel.Toolbar asChild>
          <Toolbar.Root>
            <Toolbar.IconButton icon='ph--calendar--duotone' iconOnly variant='ghost' label={t('calendar')} />
          </Toolbar.Root>
        </Panel.Toolbar>
        <Panel.Content>
          {objects.length > 0 ? (
            <EventList events={objects} selected={selected} onSelect={handleSelect} />
          ) : (
            <CalendarEmpty calendar={calendar} />
          )}
        </Panel.Content>
      </Panel.Root>
    </div>
  );
};
