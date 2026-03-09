//
// Copyright 2023 DXOS.org
//

import React, { useCallback } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { type SurfaceComponentProps } from '@dxos/app-toolkit/ui';
import { type Feed, Obj, Query } from '@dxos/echo';
import { ATTENDABLE_PATH_SEPARATOR, DeckOperation } from '@dxos/plugin-deck/types';
import { Filter, useQuery } from '@dxos/react-client/echo';
import { Panel, Toolbar, useTranslation } from '@dxos/react-ui';
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
        companion: `${id}${ATTENDABLE_PATH_SEPARATOR}event`,
      });
    },
    [singleSelect, invokePromise, id],
  );

  // TODO(burdon): Create story.
  return (
    <Panel.Root role={role} classNames='@container'>
      <Panel.Content asChild>
        <div role='none' className='grid @2xl:grid-cols-[min-content_1fr] overflow-hidden'>
          <div role='none' className='hidden @2xl:flex'>
            <NaturalCalendar.Root>
              <Panel.Toolbar asChild>
                <NaturalCalendar.Toolbar />
              </Panel.Toolbar>
              <Panel.Content asChild>
                <NaturalCalendar.Grid />
              </Panel.Content>
            </NaturalCalendar.Root>
          </div>

          <Panel.Root>
            <Panel.Toolbar asChild>
              <Toolbar.Root classNames='border-b border-subdued-separator'>
                <Toolbar.IconButton icon='ph--calendar--duotone' iconOnly variant='ghost' label={t('calendar')} />
              </Toolbar.Root>
            </Panel.Toolbar>
            <Panel.Content asChild>
              <EventList events={objects} selected={selected} onSelect={handleSelect} />
            </Panel.Content>
          </Panel.Root>
        </div>
      </Panel.Content>
    </Panel.Root>
  );
};
