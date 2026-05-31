//
// Copyright 2026 DXOS.org
//

import { isSameDay } from 'date-fns';
import React, { useCallback, useMemo, useState } from 'react';

import { Surface, useOperationInvoker } from '@dxos/app-framework/ui';
import { LayoutOperation, getObjectPathFromObject } from '@dxos/app-toolkit';
import { type AppSurface, useShowItem } from '@dxos/app-toolkit/ui';
import { Obj } from '@dxos/echo';
import { getSpace, useObject } from '@dxos/react-client/echo';
import { Panel } from '@dxos/react-ui';
import { linkedSegment, useArticleKeyboardNavigation, useSelected } from '@dxos/react-ui-attention';
import { Calendar as NaturalCalendar } from '@dxos/react-ui-calendar';
import { Menu, MenuBuilder, useMenuBuilder } from '@dxos/react-ui-menu';
import { mx } from '@dxos/ui-theme';

import { SegmentStack, type SegmentCardAction } from '#components';
import { meta } from '#meta';
import { Segment, Trip } from '#types';

export type TripArticleProps = AppSurface.ObjectArticleProps<Trip.Trip>;

const SEGMENT_KINDS: Segment.Kind[] = ['flight', 'train', 'boat', 'road', 'accommodation', 'activity'];

export const TripArticle = ({ role, subject, attendableId }: TripArticleProps) => {
  const { invokePromise } = useOperationInvoker();
  const showItem = useShowItem();

  // Subscribe to subject mutations so edits made in the SegmentArticle
  // companion re-render the stack here.
  const reactiveSubject = Obj.isObject(subject) ? subject : undefined;
  const [snapshot] = useObject(reactiveSubject);
  const trip = (snapshot ?? subject) as Trip.Trip;

  const id = attendableId ?? Obj.getURI(subject);
  const currentId = useSelected(id, 'single');

  // Resolve segment refs to live objects (filtered to currently loaded), sorted by primary date.
  const segments = useMemo(() => Trip.getSegments(trip), [trip.segments]);

  const calendarDates = segments.flatMap((seg): Date[] => {
    const primary = Segment.getPrimaryDate(seg);
    const dates: Date[] = primary ? [primary] : [];
    const end = Segment.parseDate(Segment.getArriveAt(seg));
    if (end && seg.details._tag === 'accommodation') {
      dates.push(end);
    }
    return dates;
  });

  // Most recent calendar day / range selection, used to pre-fill new segment dates.
  const [calendarSelection, setCalendarSelection] = useState<{ from: Date; to?: Date }>();

  const handleDateSelect = useCallback(
    ({ date }: { date: Date }) => {
      setCalendarSelection({ from: date });
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

  const handleDateRangeSelect = useCallback(({ range }: { range: { from: Date; to: Date } }) => {
    setCalendarSelection({ from: range.from, to: range.to });
  }, []);

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

  const [showGlobe, setShowGlobe] = useState(false);

  const handleNavigate = useCallback(
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

  // Wire 'j' (next) / 'k' (previous) to navigate the segment stack, matching CalendarArticle.
  useArticleKeyboardNavigation({ articleId: id, items: segments, currentId, onSelect: handleNavigate });

  const handleAddSegment = useCallback(
    (kind: Segment.Kind) => {
      const space = getSpace(subject);
      if (!space) {
        return;
      }
      const segment = space.db.add(Segment.makeDefault(kind));
      Trip.addSegment(subject, segment);
      // Pre-fill the start (and end, for a range) from the current calendar selection.
      if (calendarSelection?.from) {
        Segment.setDepartAt(segment, calendarSelection.from.toISOString());
      }
      if (calendarSelection?.to) {
        Segment.setArriveAt(segment, calendarSelection.to.toISOString());
      }
    },
    [subject, calendarSelection],
  );

  // Reactive toolbar (idiom: org.dxos.react-ui-menu.toolbarMenu) — an "add segment" dropdown of
  // kinds and a globe on/off toggle, composed as data rather than hand-wired Toolbar children.
  const menuActions = useMenuBuilder(
    () =>
      MenuBuilder.make()
        .group(
          'add',
          {
            label: ['segment.add.label', { ns: meta.id }],
            icon: 'ph--plus--regular',
            variant: 'dropdownMenu',
          },
          (group) => {
            for (const kind of SEGMENT_KINDS) {
              group.action(
                `add-${kind}`,
                { label: [`segment.${kind}.label`, { ns: meta.id }], icon: Segment.kindIcon(kind) },
                () => handleAddSegment(kind),
              );
            }
          },
        )
        .separator()
        .action(
          'toggle-globe',
          {
            label: ['globe.toggle.label', { ns: meta.id }],
            icon: 'ph--globe-hemisphere-west--regular',
            iconOnly: true,
            checked: showGlobe,
          },
          () => setShowGlobe((value) => !value),
        )
        .build(),
    [handleAddSegment, showGlobe],
  );

  return (
    <div role={role} className='@container dx-container overflow-hidden'>
      <div
        className={mx(
          'grid h-full',
          showGlobe ? 'grid-rows-[minmax(0,1fr)_minmax(0,1fr)]' : 'grid-rows-[minmax(0,1fr)]',
        )}
      >
        {/* Row 1: calendar + segment stack. */}
        <div className='grid grid-cols-1 @3xl:grid-cols-[min-content_1fr] min-bs-0 overflow-hidden'>
          <Panel.Root className='hidden @3xl:block'>
            <NaturalCalendar.Root>
              <Panel.Toolbar asChild>
                <NaturalCalendar.Toolbar />
              </Panel.Toolbar>
              <Panel.Content asChild>
                <NaturalCalendar.Grid
                  dates={calendarDates}
                  onSelect={handleDateSelect}
                  onSelectRange={handleDateRangeSelect}
                />
              </Panel.Content>
            </NaturalCalendar.Root>
          </Panel.Root>
          <Panel.Root>
            <Panel.Toolbar>
              <Menu.Root {...menuActions} attendableId={attendableId}>
                <Menu.Toolbar />
              </Menu.Root>
            </Panel.Toolbar>
            <Panel.Content asChild>
              <SegmentStack id={id} segments={segments} currentId={currentId} onAction={handleAction} />
            </Panel.Content>
          </Panel.Root>
        </div>

        {/* Row 2: map surface (globe / map variants, toggled via the toolbar). Self-contained:
            it reads the current segment selection via useSelected. */}
        {showGlobe && (
          <Panel.Root className='min-bs-0 overflow-hidden border-t border-subdued-separator'>
            <Panel.Content>
              <Surface.Surface role='trip-map' data={{ subject, attendableId: id }} limit={1} />
            </Panel.Content>
          </Panel.Root>
        )}
      </div>
    </div>
  );
};
