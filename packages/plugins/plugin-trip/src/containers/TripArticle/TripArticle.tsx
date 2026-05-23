//
// Copyright 2026 DXOS.org
//

import { isSameDay } from 'date-fns';
import React, { type ChangeEvent, useCallback, useMemo, useState } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { LayoutOperation, getObjectPathFromObject } from '@dxos/app-toolkit';
import { type AppSurface, useShowItem } from '@dxos/app-toolkit/ui';
import { Obj, Ref } from '@dxos/echo';
import { useObject } from '@dxos/react-client/echo';
import { IconButton, Panel, Toolbar, useTranslation } from '@dxos/react-ui';
import { linkedSegment, useSelected } from '@dxos/react-ui-attention';
import { Calendar as NaturalCalendar } from '@dxos/react-ui-calendar';

import { SegmentStack, type SegmentCardAction } from '#components';
import { TripMapView } from '#containers';
import { meta } from '#meta';
import { Segment, Trip } from '#types';

type ViewMode = 'stack' | 'map';

export type TripArticleProps = AppSurface.ObjectArticleProps<Trip.Trip>;

const byPrimaryDate = (a: Segment.Segment, b: Segment.Segment): number => {
  const da = Segment.getPrimaryDate(a)?.getTime() ?? 0;
  const db = Segment.getPrimaryDate(b)?.getTime() ?? 0;
  return da - db;
};

export const TripArticle = ({ role, subject, attendableId }: TripArticleProps) => {
  const { t } = useTranslation(meta.id);
  const { invokePromise } = useOperationInvoker();
  const showItem = useShowItem();

  // Subscribe to subject mutations so edits made in the SegmentArticle
  // companion re-render the stack here.
  const reactiveSubject = Obj.isObject(subject) ? subject : undefined;
  const [snapshot] = useObject(reactiveSubject);
  const trip = (snapshot ?? subject) as Trip.Trip;

  const id = attendableId ?? Obj.getDXN(subject).toString();
  const currentId = useSelected(id, 'single');

  // Resolve segment refs to live objects (filtered to currently loaded).
  const segments = useMemo(() => {
    const list = (trip.segments ?? [])
      .map((ref) => (Ref.isRef(ref) ? ref.target : (ref as unknown as Segment.Segment | undefined)))
      .filter((s): s is Segment.Segment => Segment.instanceOf(s));
    return [...list].sort(byPrimaryDate);
  }, [trip.segments]);

  const calendarDates = segments.flatMap((seg): Date[] => {
    const primary = Segment.getPrimaryDate(seg);
    const dates: Date[] = primary ? [primary] : [];
    if (seg.kind === 'lodging') {
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
        if (seg.kind === 'lodging') {
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
      switch (action.type) {
        case 'current':
          void showItem({
            contextId: id,
            selectionId: action.segmentId,
            companion: linkedSegment('segment'),
            path: getObjectPathFromObject(subject),
          });
          break;
        case 'delete':
          Trip.removeSegment(subject, action.segmentId);
          break;
      }
    },
    [id, showItem, subject],
  );

  const [newSegmentKind, setNewSegmentKind] = useState<Segment.Kind>('flight');
  const [viewMode, setViewMode] = useState<ViewMode>('stack');

  const handleMapSelect = useCallback(
    (segmentId: string) => {
      void showItem({
        contextId: id,
        selectionId: segmentId,
        companion: linkedSegment('segment'),
        path: getObjectPathFromObject(subject),
      });
    },
    [id, showItem, subject],
  );

  const handleAddSegment = useCallback(() => {
    const segment = Segment.makeDefault(newSegmentKind);
    Trip.addSegment(subject, segment);
  }, [newSegmentKind, subject]);

  const KIND_OPTIONS: { value: Segment.Kind; label: string }[] = [
    { value: 'flight', label: t('segment.flight.label') },
    { value: 'train', label: t('segment.train.label') },
    { value: 'boat', label: t('segment.boat.label') },
    { value: 'road', label: t('segment.road.label') },
    { value: 'lodging', label: t('segment.lodging.label') },
    { value: 'activity', label: t('segment.activity.label') },
  ];

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
              <select
                className='dx-input rounded px-2 py-1 bg-input-surface text-sm'
                value={newSegmentKind}
                onChange={(e: ChangeEvent<HTMLSelectElement>) => setNewSegmentKind(e.target.value as Segment.Kind)}
                aria-label='Segment kind'
              >
                {KIND_OPTIONS.map(({ value, label }) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <IconButton icon='ph--plus--regular' label={t('segment.add.label')} onClick={handleAddSegment} />
              <div role='separator' className='flex-1' />
              <IconButton
                icon='ph--list-dashes--regular'
                iconOnly
                variant={viewMode === 'stack' ? 'default' : 'ghost'}
                label='Stack view'
                onClick={() => setViewMode('stack')}
              />
              <IconButton
                icon='ph--globe--regular'
                iconOnly
                variant={viewMode === 'map' ? 'default' : 'ghost'}
                label='Map view'
                onClick={() => setViewMode('map')}
              />
            </Toolbar.Root>
          </Panel.Toolbar>
          <Panel.Content asChild>
            {viewMode === 'map' ? (
              <TripMapView segments={segments} onSelect={handleMapSelect} />
            ) : (
              <SegmentStack id={id} segments={segments} currentId={currentId} onAction={handleAction} />
            )}
          </Panel.Content>
        </Panel.Root>
      </div>
    </div>
  );
};
