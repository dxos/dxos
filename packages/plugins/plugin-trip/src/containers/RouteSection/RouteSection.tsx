//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { Obj } from '@dxos/echo';
import { useObject, useObjects } from '@dxos/react-client/echo';
import { Icon, IconButton, Input, useTranslation } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { meta } from '#meta';
import { Routing, RoutingOperation, Segment, Trip } from '#types';

/** Debounce (ms) before auto-planning after a city-list change. */
const PLAN_DEBOUNCE_MS = 600;

export type RouteSectionProps = {
  trip: Trip.Trip;
};

type Totals = { legs: number; distanceMeters: number; durationSeconds: number };

/** Ordered cities derived from the trip's planner-owned road segments (first origin + each destination). */
const derivePlannedCities = (trip: Trip.Trip): Routing.Waypoint[] => {
  const roads = Trip.getSegments(trip).filter(Segment.isPlannedRoad);
  if (roads.length === 0) {
    return [];
  }
  const cities: Routing.Waypoint[] = [];
  const first = Segment.getOrigin(roads[0]);
  if (first) {
    cities.push(first);
  }
  for (const road of roads) {
    const destination = Segment.getDestination(road);
    if (destination) {
      cities.push(destination);
    }
  }
  return cities;
};

const formatDistance = (meters: number): string => `${Math.round(meters / 1000)} km`;

const formatDuration = (seconds: number): string => {
  const totalMinutes = Math.round(seconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours} h ${minutes} m` : `${minutes} m`;
};

/**
 * Builds and plans a multi-city driving route. Renders an ordered, editable city list; any change
 * (add / remove / reorder) debounces a `PlanRoute` invocation that calls the registered routing
 * provider and reconciles the trip's road segments. The list seeds once from the trip's existing
 * planner-owned road segments.
 */
export const RouteSection = ({ trip }: RouteSectionProps) => {
  const { t } = useTranslation(meta.id);
  const { invokePromise } = useOperationInvoker();

  // Subscribe so the seed reflects loaded segment refs (mirrors TripArticle).
  const reactiveSubject = Obj.isObject(trip) ? trip : undefined;
  const [segmentRefs] = useObject(reactiveSubject, 'segments');
  useObjects(segmentRefs ?? []);

  const [cities, setCities] = useState<Routing.Waypoint[]>([]);
  const [value, setValue] = useState('');
  const [totals, setTotals] = useState<Totals | undefined>(undefined);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);

  // `dirty` distinguishes user edits (which should auto-plan) from the initial seed (which must not).
  const dirtyRef = useRef(false);
  const seededRef = useRef(false);

  // Seed the list once from any pre-existing planned road segments.
  useEffect(() => {
    if (seededRef.current) {
      return;
    }
    const derived = derivePlannedCities(trip);
    if (derived.length > 0) {
      seededRef.current = true;
      setCities(derived);
    }
  }, [trip, segmentRefs?.length]);

  const runPlan = useCallback(
    async (waypoints: Routing.Waypoint[]) => {
      setPending(true);
      setError(undefined);
      try {
        const { data, error: invocationError } = await invokePromise(RoutingOperation.PlanRoute, { trip, waypoints });
        if (invocationError) {
          setError(invocationError.message || t('route.error.message'));
          return;
        }
        if (data) {
          setTotals(data);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : t('route.error.message'));
      } finally {
        setPending(false);
      }
    },
    [trip, invokePromise, t],
  );

  // Debounced auto-plan on user-initiated city changes.
  useEffect(() => {
    if (!dirtyRef.current || cities.length < 2) {
      return;
    }
    const handle = setTimeout(() => {
      void runPlan(cities);
    }, PLAN_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [cities, runPlan]);

  const update = useCallback((next: Routing.Waypoint[]) => {
    dirtyRef.current = true;
    setCities(next);
  }, []);

  const handleAdd = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed) {
      return;
    }
    update([...cities, trimmed]);
    setValue('');
  }, [value, cities, update]);

  const handleRemove = useCallback(
    (index: number) => update(cities.filter((_, idx) => idx !== index)),
    [cities, update],
  );

  const handleMove = useCallback(
    (index: number, delta: number) => {
      const target = index + delta;
      if (target < 0 || target >= cities.length) {
        return;
      }
      const next = [...cities];
      [next[index], next[target]] = [next[target], next[index]];
      update(next);
    },
    [cities, update],
  );

  const summary = useMemo(() => {
    if (pending) {
      return t('route.planning.label');
    }
    if (!totals || totals.legs === 0) {
      return undefined;
    }
    return t('route.totals.label', {
      legs: totals.legs,
      distance: formatDistance(totals.distanceMeters),
      duration: formatDuration(totals.durationSeconds),
    });
  }, [pending, totals, t]);

  return (
    <div className='flex flex-col gap-1 p-2 border-b border-subdued-separator'>
      <div className='flex items-center gap-2 text-description'>
        <Icon icon='ph--path--regular' size={4} />
        <span className='grow text-sm'>{t('route.section.label')}</span>
      </div>

      {cities.length === 0 ? (
        <p className='text-sm text-description'>{t('route.empty.message')}</p>
      ) : (
        <ol className='flex flex-col gap-1'>
          {cities.map((city, index) => (
            <li key={index} className='flex items-center gap-1'>
              <span className='is-5 text-end text-sm text-description tabular-nums'>{index + 1}.</span>
              <span className='grow truncate text-sm'>{Routing.waypointLabel(city)}</span>
              <IconButton
                variant='ghost'
                icon='ph--caret-up--regular'
                iconOnly
                label={t('route.up.label')}
                disabled={index === 0}
                onClick={() => handleMove(index, -1)}
              />
              <IconButton
                variant='ghost'
                icon='ph--caret-down--regular'
                iconOnly
                label={t('route.down.label')}
                disabled={index === cities.length - 1}
                onClick={() => handleMove(index, 1)}
              />
              <IconButton
                variant='ghost'
                icon='ph--x--regular'
                iconOnly
                label={t('route.remove.label')}
                onClick={() => handleRemove(index)}
              />
            </li>
          ))}
        </ol>
      )}

      <div className='flex items-center gap-1'>
        <Input.Root>
          <Input.TextInput
            placeholder={t('route.add.placeholder')}
            value={value}
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                handleAdd();
              }
            }}
          />
        </Input.Root>
        <IconButton
          variant='primary'
          icon='ph--plus--regular'
          iconOnly
          label={t('route.add.label')}
          disabled={!value.trim()}
          onClick={handleAdd}
        />
      </div>

      {error ? (
        <p className='text-sm text-error'>{error}</p>
      ) : (
        summary && <p className={mx('text-sm text-description tabular-nums', pending && 'animate-pulse')}>{summary}</p>
      )}
    </div>
  );
};
