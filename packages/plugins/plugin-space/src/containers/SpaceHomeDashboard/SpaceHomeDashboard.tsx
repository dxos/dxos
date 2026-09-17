//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import * as Effect from 'effect/Effect';
import * as AsyncResult from 'effect/unstable/reactivity/AsyncResult';
import * as Atom from 'effect/unstable/reactivity/Atom';
import React, { useDeferredValue, useMemo } from 'react';

import { HomeSection, usePluginManager } from '@dxos/app-framework/ui';
import { Aggregate, Collection, Filter, Query, Type } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { type Space, useMembers } from '@dxos/react-client/echo';
import { useTranslation } from '@dxos/react-ui';
import { Dashboard } from '@dxos/react-ui-dashboard';

import { SPACE_STATS_QUERY, countObjects, countTypenames } from '#dashboard';
import { meta } from '#meta';

import { type HourCount, toActivity } from './activity.ts';

const STAT_IDS = ['objects', 'types', 'collections', 'members', 'active-days', 'plugins'] as const;

export type SpaceStatId = (typeof STAT_IDS)[number];

type SpaceHomeDashboardProps = {
  space?: Space;
  /** Stat cards to render, in order; defaults to all. */
  stats?: readonly SpaceStatId[];
  onClose?: () => void;
};

const COLLECTION_TYPENAME = Type.getTypename(Collection.Collection);

const hourly = (filter: Filter.Any) =>
  Query.select(filter).aggregate({ hour: Aggregate.updated('hour'), count: Aggregate.count() });

type ActivityHistory = { cutoff: number; hours: readonly HourCount[] };

/**
 * Activity before the start of today, read once per space for the session. The snapshot is never
 * recomputed: an object touched on an earlier day keeps that day even after it is edited again,
 * which the per-object `updatedAt` it is built from could not tell us. The live window from
 * `cutoff` onward is a separate reactive query. The family returns the atom itself: a kept-alive
 * atom is what pins the cache entry, so a wrapper object around it would be collected and rebuilt.
 */
const activityHistory = Atom.family((space: Space) =>
  Atom.make(() =>
    Effect.promise(async (): Promise<ActivityHistory> => {
      const today = new Date();
      const cutoff = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
      const hours = await space.db.query(hourly(Filter.updated({ before: cutoff - 1 }))).run();
      return { cutoff, hours };
    }),
  ).pipe(Atom.keepAlive),
);

const NO_HISTORY: ActivityHistory = { cutoff: Number.POSITIVE_INFINITY, hours: [] };

/**
 * Space stats and activity matrix for the Home article. Every number comes from host-side counts
 * (`Aggregate.type()`, `Aggregate.updated()`), so no object is loaded into the tab to draw it.
 */
export const SpaceHomeDashboard = ({ space, stats = STAT_IDS, onClose }: SpaceHomeDashboardProps) => {
  if (!space) {
    return null;
  }

  return <SpaceDashboard space={space} stats={stats} onClose={onClose} />;
};

SpaceHomeDashboard.displayName = 'SpaceHomeDashboard';

const SpaceDashboard = ({
  space,
  stats,
  onClose,
}: Required<Pick<SpaceHomeDashboardProps, 'space' | 'stats'>> & Pick<SpaceHomeDashboardProps, 'onClose'>) => {
  const { t } = useTranslation(meta.profile.key);
  const members = useMembers(space.key);

  const manager = usePluginManager();
  const core = useAtomValue(manager.core);
  const enabled = useAtomValue(manager.enabled);
  const plugins = useMemo(() => enabled.filter((id) => !core.includes(id)).length, [core, enabled]);

  // Deferred so a burst of index passes (a freshly opened space) never competes with input.
  const counts = useDeferredValue(useQuery(space.db, SPACE_STATS_QUERY));
  const history = AsyncResult.getOrElse(useAtomValue(activityHistory(space)), () => NO_HISTORY);
  // Until the snapshot has a cutoff the live window has no start; an empty selection keeps the
  // query shape stable instead of briefly counting everything.
  const liveQuery = useMemo(
    () => hourly(Number.isFinite(history.cutoff) ? Filter.updated({ after: history.cutoff }) : Filter.nothing()),
    [history.cutoff],
  );
  const live = useDeferredValue(useQuery(space.db, liveQuery));
  const activity = useMemo(() => toActivity(history.hours, live), [history.hours, live]);

  const values: Record<SpaceStatId, number> = {
    'objects': countObjects(counts),
    'types': countTypenames(counts),
    'collections': countObjects(counts, COLLECTION_TYPENAME),
    'members': members.length,
    'active-days': activity.length,
    'plugins': plugins,
  };

  return (
    <HomeSection.Root>
      <HomeSection.Header title={t('space-home.dashboard.heading')} onClose={onClose} />
      <Dashboard.Stats>
        {stats.map((id) => (
          <Dashboard.Stat key={id}>
            <Dashboard.StatLabel>{t(`space-home.dashboard.${id}.label`)}</Dashboard.StatLabel>
            <Dashboard.StatValue value={values[id]} />
          </Dashboard.Stat>
        ))}
      </Dashboard.Stats>
      {/* Smaller cells so a full year fits the 40rem home column without horizontal scroll. */}
      <Dashboard.Activity classNames='[--dx-dashboard-cell:0.75rem]' data={activity} endDate={new Date()} />
    </HomeSection.Root>
  );
};
