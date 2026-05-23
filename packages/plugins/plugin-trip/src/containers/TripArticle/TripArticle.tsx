//
// Copyright 2026 DXOS.org
//

import { isSameDay } from 'date-fns';
import React, { useCallback } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { LayoutOperation, getObjectPathFromObject } from '@dxos/app-toolkit';
import { type AppSurface, useShowItem } from '@dxos/app-toolkit/ui';
import { Obj } from '@dxos/echo';
import { IconButton, Panel, Toolbar, useTranslation } from '@dxos/react-ui';
import { linkedSegment, useSelected } from '@dxos/react-ui-attention';
import { Calendar as NaturalCalendar } from '@dxos/react-ui-calendar';

import { SegmentStack, type SegmentCardAction } from '#components';
import { meta } from '#meta';
import { Segment, Trip } from '#types';

export type TripArticleProps = AppSurface.ObjectArticleProps<Trip.Trip>;

const byPrimaryDate = (a: Segment.Any, b: Segment.Any): number => {
  const da = Segment.getPrimaryDate(a)?.getTime() ?? 0;
  const db = Segment.getPrimaryDate(b)?.getTime() ?? 0;
  return da - db;
};

export const TripArticle = ({ role, subject, attendableId }: TripArticleProps) => {
  const { t } = useTranslation(meta.id);
  const { invokePromise } = useOperationInvoker();
  const showItem = useShowItem();
  const id = attendableId ?? Obj.getDXN(subject).toString();
  const currentId = useSelected(id, 'single');

  const segments = [...(subject.segments ?? [])].sort(byPrimaryDate);

  const calendarDates = segments.flatMap((seg): Date[] => {
    const primary = Segment.getPrimaryDate(seg);
    const dates: Date[] = primary ? [primary] : [];
    if (seg._tag === 'lodging') {
      const end = Segment.parseDate(seg.checkOut);
      if (end) {
        dates.push(end);
      }
    }
    return dates;
  });

  const handleDateSelect = useCallback(
    ({ date }: { date: Date }) => {
      const match = segments.find((seg) => {
        const primary = Segment.getPrimaryDate(seg);
        if (primary && isSameDay(primary, date)) {
          return true;
        }
        if (seg._tag === 'lodging') {
          const checkOut = Segment.parseDate(seg.checkOut);
          return !!checkOut && isSameDay(checkOut, date);
        }
        return false;
      });
      if (match) {
        void invokePromise(LayoutOperation.Select, {
          contextId: id,
          subject: { mode: 'single', id: match.id },
        });
      }
    },
    [segments, id, invokePromise],
  );

  const handleAction = useCallback(
    (action: SegmentCardAction) => {
      if (action.type === 'current') {
        void showItem({
          contextId: id,
          selectionId: action.segmentId,
          companion: linkedSegment('segment'),
          path: getObjectPathFromObject(subject),
        });
      }
    },
    [id, showItem, subject],
  );

  const handleAddSegment = useCallback(() => {
    const newId = `seg-${Date.now()}`;
    Obj.update(subject, (subject) => {
      subject.segments = [...(subject.segments ?? []), Segment.makeDefault('flight', newId)] as typeof subject.segments;
    });
  }, [subject]);

  return (
    <div role={role} className='@container dx-container overflow-hidden'>
      <div className='grid grid-cols-1 @3xl:grid-cols-[min-content_1fr] h-full'>
        <Panel.Root className='hidden @3xl:block'>
          <NaturalCalendar.Root>
            <Panel.Toolbar asChild>
              <NaturalCalendar.Toolbar />
            </Panel.Toolbar>
            <Panel.Content asChild>
              <NaturalCalendar.Grid dates={calendarDates} onSelect={handleDateSelect} />
            </Panel.Content>
          </NaturalCalendar.Root>
        </Panel.Root>
        <Panel.Root>
          <Panel.Toolbar asChild>
            <Toolbar.Root>
              <IconButton icon='ph--plus--regular' label={t('segment.add.label')} onClick={handleAddSegment} />
            </Toolbar.Root>
          </Panel.Toolbar>
          <Panel.Content asChild>
            <SegmentStack id={id} segments={segments} currentId={currentId} onAction={handleAction} />
          </Panel.Content>
        </Panel.Root>
      </div>
    </div>
  );
};
