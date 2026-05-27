//
// Copyright 2026 DXOS.org
//

import { isSameDay } from 'date-fns';
import React, { useCallback, useMemo, useState } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { LayoutOperation, getObjectPathFromObject } from '@dxos/app-toolkit';
import { type AppSurface, useShowItem } from '@dxos/app-toolkit/ui';
import { Obj, Ref } from '@dxos/echo';
import { getSpace, useObject } from '@dxos/react-client/echo';
import { Panel, Select, Toolbar, useTranslation } from '@dxos/react-ui';
import { linkedSegment, useSelected } from '@dxos/react-ui-attention';
import { Calendar as NaturalCalendar } from '@dxos/react-ui-calendar';

import { SegmentStack, type SegmentCardAction, TripMapView } from '#components';
import { meta } from '#meta';
import { Segment, Trip } from '#types';

const byPrimaryDate = (a: Segment.Segment, b: Segment.Segment): number => {
  const da = Segment.getPrimaryDate(a)?.getTime() ?? 0;
  const db = Segment.getPrimaryDate(b)?.getTime() ?? 0;
  return da - db;
};

type ViewMode = 'stack' | 'map';

export type TripArticleProps = AppSurface.ObjectArticleProps<Trip.Trip>;

export const TripArticle = ({ role, subject, attendableId }: TripArticleProps) => {
  const { t } = useTranslation(meta.id);
  const { invokePromise } = useOperationInvoker();
  const showItem = useShowItem();

  // Subscribe to subject mutations so edits made in the SegmentArticle
  // companion re-render the stack here.
  const reactiveSubject = Obj.isObject(subject) ? subject : undefined;
  const [snapshot] = useObject(reactiveSubject);
  const trip = (snapshot ?? subject) as Trip.Trip;

  const id = attendableId ?? Obj.getURI(subject);
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
    const end = Segment.parseDate(Segment.getArriveAt(seg));
    if (end && seg.details._tag === 'accommodation') {
      dates.push(end);
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
        if (seg.details._tag === 'accommodation') {
          const checkOut = Segment.parseDate(seg.details.checkOut);
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
    const space = getSpace(subject);
    if (!space) {
      return;
    }
    const segment = space.db.add(Segment.makeDefault(newSegmentKind));
    Trip.addSegment(subject, segment);
  }, [newSegmentKind, subject]);

  const KIND_OPTIONS: { value: Segment.Kind; label: string }[] = [
    {
      value: 'flight',
      label: t('segment.flight.label'),
    },
    {
      value: 'train',
      label: t('segment.train.label'),
    },
    {
      value: 'boat',
      label: t('segment.boat.label'),
    },
    {
      value: 'road',
      label: t('segment.road.label'),
    },
    {
      value: 'accommodation',
      label: t('segment.accommodation.label'),
    },
    {
      value: 'activity',
      label: t('segment.activity.label'),
    },
  ];

  const showCalendar = viewMode === 'stack';
  return (
    <div role={role} className='@container dx-container overflow-hidden'>
      <div
        className={
          showCalendar ? 'grid grid-cols-1 @3xl:grid-cols-[min-content_1fr] h-full' : 'grid grid-cols-1 h-full'
        }
      >
        {showCalendar && (
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
        )}
        <Panel.Root>
          <Panel.Toolbar asChild>
            <Toolbar.Root>
              <Select.Root value={newSegmentKind} onValueChange={(value) => setNewSegmentKind(value as Segment.Kind)}>
                <Toolbar.Button asChild>
                  <Select.TriggerButton placeholder={t('segment.add.label')} />
                </Toolbar.Button>
                <Select.Portal>
                  <Select.Content>
                    <Select.Viewport>
                      {KIND_OPTIONS.map(({ value, label }) => (
                        <Select.Option key={value} value={value}>
                          {label}
                        </Select.Option>
                      ))}
                    </Select.Viewport>
                    <Select.Arrow />
                  </Select.Content>
                </Select.Portal>
              </Select.Root>
              <Toolbar.IconButton
                icon='ph--plus--regular'
                iconOnly
                label={t('segment.add.label')}
                onClick={handleAddSegment}
              />
              <div className='grow' />
              <Toolbar.ToggleGroup
                type='single'
                value={viewMode}
                onValueChange={(value) => value && setViewMode(value as ViewMode)}
              >
                <Toolbar.ToggleGroupIconItem
                  value='stack'
                  icon='ph--list-dashes--regular'
                  iconOnly
                  label='Stack view'
                />
                <Toolbar.ToggleGroupIconItem value='map' icon='ph--globe--regular' iconOnly label='Map view' />
              </Toolbar.ToggleGroup>
            </Toolbar.Root>
          </Panel.Toolbar>
          <Panel.Content asChild>
            {viewMode === 'map' ? (
              <TripMapView segments={segments} selectedSegmentId={currentId} onSelect={handleMapSelect} />
            ) : (
              <SegmentStack id={id} segments={segments} currentId={currentId} onAction={handleAction} />
            )}
          </Panel.Content>
        </Panel.Root>
      </div>
    </div>
  );
};
