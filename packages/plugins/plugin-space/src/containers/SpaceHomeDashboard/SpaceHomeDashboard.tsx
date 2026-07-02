//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect-atom/atom-react';
import React, { useMemo, useState } from 'react';

import { usePluginManager } from '@dxos/app-framework/ui';
import { Collection, Filter, Obj, Query } from '@dxos/echo';
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
};

/**
 * Space stats and activity matrix for the Home article. Stats are derived from the object graph
 * (counts of objects, distinct types, collections, members); the matrix buckets objects by the
 * day they were last touched (`updatedAt`, falling back to `createdAt`).
 *
 * NOTE: per-object `updatedAt` only reflects the latest change, so the matrix undercounts busy
 * days in the past.
 * TODO(burdon): Richer stats need sources beyond the object graph:
 *  - Edits per day: automerge change graph (echo-pipeline) aggregated into a daily histogram.
 *  - Storage size / sync state: client diagnostics (`client.diagnostics()`) or SpaceSyncState.
 *  - Relations count: needs a relations query (Query.select over relation types).
 *  - Member activity / presence history: EDGE presence feed (only live viewers are exposed today).
 */
export const SpaceHomeDashboard = ({ space, stats = STAT_IDS }: SpaceHomeDashboardProps) => {
  const { t } = useTranslation(meta.profile.key);
  const [range, setRange] = useState('all');

  const query = useMemo(() => Query.select(Filter.everything()), []);
  const members = useMembers(space?.key);

  const manager = usePluginManager();
  const core = useAtomValue(manager.core);
  const enabled = useAtomValue(manager.enabled);
  const plugins = useMemo(() => enabled.filter((id) => !core.includes(id)).length, [core, enabled]);

  // TODO(burdon): Can we caches this?
  const objects = useQuery(space ? space.db : undefined, query);
  const { activity, values } = useMemo(() => {
    const typenames = new Set<string>();
    const days = new Set<string>();
    let collections = 0;
    const activity: ActivityDatum[] = [];
    for (const object of objects) {
      const typename = Obj.getTypename(object);
      if (typename) {
        typenames.add(typename);
      }
      if (Obj.instanceOf(Collection.Collection, object)) {
        collections++;
      }
      const objectMeta = Obj.getMeta(object);
      const timestamp = objectMeta.updatedAt ?? objectMeta.createdAt;
      if (timestamp) {
        const date = new Date(timestamp);
        days.add(date.toDateString());
        activity.push({ date, value: 1 });
      }
    }

    const values: Record<SpaceStatId, number> = {
      'objects': objects.length,
      'types': typenames.size,
      'collections': collections,
      'members': members.length,
      'active-days': days.size,
      'plugins': plugins,
    };

    return { activity, values };
  }, [objects, members, plugins]);

  if (!space) {
    return null;
  }

  return (
    <Dashboard.Root range={range} onRangeChange={setRange}>
      <div className='flex justify-center w-full'>
        <Dashboard.Content classNames='w-full max-w-[40rem]'>
          <div className='flex items-end justify-between'>
            <h2 className='text-sm font-medium text-description'>{t('space-home.dashboard.heading')}</h2>
          </div>
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
        </Dashboard.Content>
      </div>
    </Dashboard.Root>
  );
};

SpaceHomeDashboard.displayName = 'SpaceHomeDashboard';
