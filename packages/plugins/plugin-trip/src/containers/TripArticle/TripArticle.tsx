//
// Copyright 2026 DXOS.org
//

import { isSameDay } from 'date-fns';
import React, { useCallback, useMemo, useState } from 'react';

import { Surface, useCapabilities, useOperationInvoker } from '@dxos/app-framework/ui';
import { LayoutOperation, Paths } from '@dxos/app-toolkit';
import { type AppSurface, useShowItem } from '@dxos/app-toolkit/ui';
import { Obj } from '@dxos/echo';
import { log } from '@dxos/log';
import { MapInline } from '@dxos/plugin-map';
import { MapCapabilities } from '@dxos/plugin-map/types';
import { getSpace, useObject, useObjects } from '@dxos/react-client/echo';
import { Panel } from '@dxos/react-ui';
import { linkedSegment, useArticleKeyboardNavigation, useSelection } from '@dxos/react-ui-attention';
import { Calendar as NaturalCalendar } from '@dxos/react-ui-calendar';
import { Menu, MenuBuilder, useMenuBuilder } from '@dxos/react-ui-menu';
import { mx } from '@dxos/ui-theme';

import { type SegmentCardAction, SegmentStack } from '#components';
import { meta } from '#meta';
import { Routing, RoutingOperation, Segment, Trip } from '#types';

export type TripArticleProps = AppSurface.ObjectArticleProps<Trip.Trip> & {
  /** Start with the inline map surface visible (otherwise toggled via the toolbar). */
  defaultShowGlobe?: boolean;
};

const SEGMENT_KINDS: Segment.Kind[] = ['flight', 'train', 'boat', 'road', 'accommodation', 'activity'];

export const TripArticle = ({ role, subject, attendableId, defaultShowGlobe }: TripArticleProps) => {
  const { invokePromise } = useOperationInvoker();
  const showItem = useShowItem();

  // Subscribe to the `segments` array property so adding/removing a segment re-renders the stack.
  const reactiveSubject = Obj.isObject(subject) ? subject : undefined;
  const [segmentRefs] = useObject(reactiveSubject, 'segments');

  const id = attendableId ?? Obj.getURI(subject);
  const currentId = useSelection(id, 'single');

  // Reactively load + subscribe to the segment ref targets. Without this the refs are read
  // synchronously via `.target` and render empty on first mount (only appearing after a later
  // mutation forced a re-render); `useObjects` re-renders (and updates `loaded`) when each target
  // loads and when a segment is edited, so the stack populates immediately and re-sorts on edits.
  const loaded = useObjects(segmentRefs ?? []);
  // `segmentRefs.length` covers add/remove; `loaded` covers target load + edits.
  const segments = useMemo(() => Trip.getSegments(subject), [subject, segmentRefs?.length, loaded]);

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
            path: Paths.getObjectPathFromObject(subject),
          });
          break;
        case 'delete':
          Trip.removeSegment(subject, action.segmentId);
          // The companion is resolved from the current selection (app-graph-builder), which only
          // re-runs on selection change — not on `segments` mutation. So when the active segment is
          // deleted, clear the selection to re-resolve the companion to empty rather than leaving the
          // now-orphaned segment shown.
          if (action.segmentId === currentId) {
            void invokePromise(LayoutOperation.Select, {
              contextId: id,
              subject: { mode: 'single', id: undefined },
            });
          }
          break;
      }
    },
    [id, currentId, showItem, subject, invokePromise],
  );

  // The inline map is rendered by plugin-map's `map` surface; only offer the toggle when a marker
  // provider can plot this trip (i.e. plugin-map is active and matches the subject).
  const mapProviders = useCapabilities(MapCapabilities.MarkerProvider);
  const mapAvailable = useMemo(() => mapProviders.some((provider) => provider.match(subject)), [mapProviders, subject]);

  const [showGlobe, setShowGlobe] = useState(defaultShowGlobe ?? false);

  const handleNavigate = useCallback(
    (segmentId: string) => {
      void showItem({
        contextId: id,
        selectionId: segmentId,
        companion: linkedSegment('segment'),
        path: Paths.getObjectPathFromObject(subject),
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
      // The chronologically-last leg, used to chain the new segment's origin from where it ended.
      const previous = segments.at(-1);
      const segment = space.db.add(Segment.makeDefault(kind));
      Trip.addSegment(subject, segment);
      // Pre-fill the start (and end, for a range) from the current calendar selection.
      if (calendarSelection?.from) {
        Segment.setDepartAt(segment, calendarSelection.from.toISOString());
      }
      if (calendarSelection?.to) {
        Segment.setArriveAt(segment, calendarSelection.to.toISOString());
      }
      // Default the origin to where the previous leg ended so a multi-leg trip chains naturally.
      const previousDestination = previous && Segment.getDestination(previous);
      if (previousDestination) {
        Segment.setOrigin(segment, previousDestination);
      }
      // Make the new segment the current item and open its (fresh) companion form.
      handleNavigate(segment.id);
    },
    [subject, segments, calendarSelection, handleNavigate],
  );

  // Computes driving routes for the trip's road segments via the registered RoutingService,
  // writing distance / duration / geometry back onto each segment.
  const [planning, setPlanning] = useState(false);
  const hasRoad = useMemo(() => segments.some((seg) => seg.details._tag === 'road'), [segments]);
  const handlePlanRoute = useCallback(async () => {
    setPlanning(true);
    try {
      const { error } = await invokePromise(RoutingOperation.PlanRoute, { trip: subject });
      if (error) {
        throw error;
      }
    } catch (err) {
      // Log the technical error; surface a friendly, non-technical toast. Known routing errors
      // (no provider / geocode miss / OSRM failure) already carry user-facing messages.
      log.catch(err);
      const friendly =
        err instanceof Routing.GeocodeError || err instanceof Routing.RouteError ? err.message : undefined;
      await invokePromise(LayoutOperation.AddToast, {
        id: `${meta.profile.key}/plan-route-error`,
        title: ['route.error.label', { ns: meta.profile.key }],
        description: friendly ?? ['route.error.message', { ns: meta.profile.key }],
        icon: 'ph--warning--regular',
      });
    } finally {
      setPlanning(false);
    }
  }, [subject, invokePromise]);

  // Reactive toolbar (idiom: org.dxos.react-ui-menu.toolbarMenu) — an "add segment" dropdown of
  // kinds, a "plan route" action, and a globe on/off toggle, composed as data rather than
  // hand-wired Toolbar children.
  const menuActions = useMenuBuilder(() => {
    const builder = MenuBuilder.make().group(
      'add',
      {
        label: ['segment.add.label', { ns: meta.profile.key }],
        icon: 'ph--plus--regular',
        variant: 'dropdownMenu',
      },
      (group) => {
        for (const kind of SEGMENT_KINDS) {
          group.action(
            `add-${kind}`,
            { label: [`segment.${kind}.label`, { ns: meta.profile.key }], icon: Segment.kindIcon(kind) },
            () => handleAddSegment(kind),
          );
        }
      },
    );

    // Push the route + map controls together to the trailing edge (single separator, so they sit
    // adjacent rather than spread apart).
    if (hasRoad || mapAvailable) {
      builder.separator();
    }

    // Offer route planning once the trip has at least one road segment to route.
    if (hasRoad) {
      builder.action(
        'plan-route',
        {
          label: [planning ? 'route.planning.label' : 'route.plan.label', { ns: meta.profile.key }],
          icon: 'ph--path--regular',
          iconOnly: true,
          disabled: planning,
        },
        () => void handlePlanRoute(),
      );
    }

    // Only offer the map toggle when a map surface can render this trip.
    if (mapAvailable) {
      builder.action(
        'toggle-globe',
        {
          label: ['globe.toggle.label', { ns: meta.profile.key }],
          icon: 'ph--globe-hemisphere-west--regular',
          iconOnly: true,
          checked: showGlobe,
        },
        () => setShowGlobe((value) => !value),
      );
    }

    return builder.build();
  }, [handleAddSegment, showGlobe, mapAvailable, hasRoad, planning, handlePlanRoute]);

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
          <NaturalCalendar.Root>
            <Panel.Root className='hidden @3xl:block border-r border-subdued-separator'>
              <Panel.Toolbar asChild>
                <NaturalCalendar.Toolbar />
              </Panel.Toolbar>
              <Panel.Content asChild>
                <NaturalCalendar.Grid
                  dates={calendarDates.map((startDate) => ({ startDate }))}
                  onSelect={handleDateSelect}
                  onSelectRange={handleDateRangeSelect}
                />
              </Panel.Content>
            </Panel.Root>
          </NaturalCalendar.Root>

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

        {/* Row 2: generic map surface (plugin-map), toggled via the toolbar. It resolves the trip's
            markers via the contributed MarkerProvider and reads the current selection via useSelection. */}
        {showGlobe && mapAvailable && (
          <Panel.Root classNames='border-t border-separator'>
            <Panel.Content>
              <Surface.Surface type={MapInline} data={{ subject, attendableId: id }} limit={1} />
            </Panel.Content>
          </Panel.Root>
        )}
      </div>
    </div>
  );
};

TripArticle.displayName = 'TripArticle';
