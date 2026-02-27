//
// Copyright 2023 DXOS.org
//

import React, { useCallback } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { type SurfaceComponentProps } from '@dxos/app-toolkit/ui';
import { type Feed, Obj, Query } from '@dxos/echo';
import { ATTENDABLE_PATH_SEPARATOR, DeckOperation } from '@dxos/plugin-deck/types';
import { Filter, useQuery } from '@dxos/react-client/echo';
import { Toolbar, useTranslation } from '@dxos/react-ui';
import { Layout } from '@dxos/react-ui';
import { useSelected, useSelectionActions } from '@dxos/react-ui-attention';
import { Calendar as NaturalCalendar } from '@dxos/react-ui-calendar';
import { Event } from '@dxos/types';

import { EventList } from '../../components';
import { meta } from '../../meta';

const byDate =
  (direction = -1) =>
  ({ startDate: a }: Event.Event, { startDate: b }: Event.Event) =>
    a < b ? -direction : a > b ? direction : 0;

export const CalendarArticle = ({ role, subject: feed }: SurfaceComponentProps<Feed.Feed>) => {
  const { t } = useTranslation(meta.id);
  const { invokePromise } = useOperationInvoker();
  const id = Obj.getDXN(feed).toString();
  const { singleSelect } = useSelectionActions([id]);
  const selected = useSelected(id, 'single');
  const db = Obj.getDatabase(feed);
  const objects = useQuery(db, Query.select(Filter.type(Event.Event)).from(feed));
  objects.sort(byDate());

  const handleSelect = useCallback(
    (event: Event.Event) => {
      singleSelect(event.id);
      void invokePromise(DeckOperation.ChangeCompanion, {
        primary: id,
        companion: `${id}${ATTENDABLE_PATH_SEPARATOR}event`,
      });
    },
    [singleSelect, invokePromise, id],
  );

  return (
    <Layout.Main role={role} classNames='@container'>
      <div role='none' className='grid @2xl:grid-cols-[min-content_1fr] overflow-hidden'>
        <div role='none' className='hidden @2xl:flex'>
          <NaturalCalendar.Root>
            <NaturalCalendar.Viewport classNames='grid grid-rows-[var(--toolbar-size)_1fr]'>
              <NaturalCalendar.Toolbar classNames='h-full border-b border-subdued-separator' />
              <NaturalCalendar.Grid />
            </NaturalCalendar.Viewport>
          </NaturalCalendar.Root>
        </div>

        <Layout.Main toolbar>
          <Toolbar.Root classNames='border-b border-subdued-separator'>
            <Toolbar.IconButton icon='ph--calendar--duotone' iconOnly variant='ghost' label={t('calendar')} />
          </Toolbar.Root>
          <EventList events={objects} selected={selected} onSelect={handleSelect} />
        </Layout.Main>
      </div>
    </Layout.Main>
  );
};
