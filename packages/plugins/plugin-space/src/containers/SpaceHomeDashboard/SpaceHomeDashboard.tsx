//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect-atom/atom-react';
import React, { useMemo } from 'react';

import { HomeSection, usePluginManager } from '@dxos/app-framework/ui';
import { Aggregate, Collection, Filter, Obj, Query } from '@dxos/echo';
import { type Space, useMembers, useQuery } from '@dxos/react-client/echo';
import { useTranslation } from '@dxos/react-ui';
import { type ActivityDatum, Dashboard } from '@dxos/react-ui-dashboard';

import { meta } from '#meta';

const STAT_IDS = ['objects', 'types', 'collections', 'members', 'active-days', 'plugins'] as const;

export type SpaceStatId = (typeof STAT_IDS)[number];

type SpaceHomeDashboardProps = {
  space?: Space;
  /** Stat cards to render, in order; defaults to all. */
  stats?: readonly SpaceStatId[];
  onClose?: () => void;
};

/**
 * Space stats and activity matrix for the Home article. Stats are derived from the object graph
 * (counts of objects, distinct types, collections, members); the matrix is an ECHO aggregate query
 * that buckets objects by the day they were last touched (`updatedAt`) and counts them per day.
 *
 * NOTE: per-object `updatedAt` only reflects the latest change, so the matrix undercounts busy
 * days in the past.
 * TODO(burdon): Richer stats need sources beyond the object graph:
 *  - Edits per day: automerge change graph (echo-pipeline) aggregated into a daily histogram.
 *  - Storage size / sync state: client diagnostics (`client.diagnostics()`) or SpaceSyncState.
 *  - Relations count: needs a relations query (Query.select over relation types).
 *  - Member activity / presence history: EDGE presence feed (only live viewers are exposed today).
 */
export const SpaceHomeDashboard = ({ space, stats = STAT_IDS, onClose }: SpaceHomeDashboardProps) => {
  const { t } = useTranslation(meta.profile.key);

  const statsQuery = useMemo(() => Query.select(Filter.everything()), []);
  // Daily activity counts, aggregated in ECHO rather than materialising every object on the client.
  const activityQuery = useMemo(
    () =>
      Query.select(Filter.everything()).aggregate({
        day: Aggregate.dateBucket('updatedAt', { resolution: 'day' }),
        count: Aggregate.count(),
      }),
    [],
  );
  const members = useMembers(space?.key);

  const manager = usePluginManager();
  const core = useAtomValue(manager.core);
  const enabled = useAtomValue(manager.enabled);
  const plugins = useMemo(() => enabled.filter((id) => !core.includes(id)).length, [core, enabled]);

  const activityRows = useQuery(space ? space.db : undefined, activityQuery);
  const activity = useMemo<ActivityDatum[]>(() => {
    const data: ActivityDatum[] = [];
    for (const row of activityRows) {
      if (row.day != null) {
        data.push({ date: new Date(row.day), value: row.count });
      }
    }
    return data;
  }, [activityRows]);

  // TODO(burdon): Can we cache this?
  const objects = useQuery(space ? space.db : undefined, statsQuery);
  const values = useMemo<Record<SpaceStatId, number>>(() => {
    const typenames = new Set<string>();
    let collections = 0;
    for (const object of objects) {
      const typename = Obj.getTypename(object);
      if (typename) {
        typenames.add(typename);
      }
      if (Obj.instanceOf(Collection.Collection, object)) {
        collections++;
      }
    }

    return {
      'objects': objects.length,
      'types': typenames.size,
      'collections': collections,
      'members': members.length,
      'active-days': activity.length,
      'plugins': plugins,
    };
  }, [objects, members, plugins, activity]);

  if (!space) {
    return null;
  }

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

SpaceHomeDashboard.displayName = 'SpaceHomeDashboard';
