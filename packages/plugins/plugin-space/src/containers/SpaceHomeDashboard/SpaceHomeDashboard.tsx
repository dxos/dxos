//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import React, { useMemo } from 'react';

import { HomeSection, usePluginManager } from '@dxos/app-framework/ui';
import { Collection, Type } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { type Space, useMembers } from '@dxos/react-client/echo';
import { useTranslation } from '@dxos/react-ui';
import { Dashboard } from '@dxos/react-ui-dashboard';

import { SPACE_STATS_QUERY, countObjects, countTypenames } from '#dashboard';
import { meta } from '#meta';

import { dailyActivityQuery, toActivity } from './activity.ts';

const STAT_IDS = ['objects', 'types', 'collections', 'members', 'active-days', 'plugins'] as const;

export type SpaceStatId = (typeof STAT_IDS)[number];

type SpaceHomeDashboardProps = {
  space?: Space;
  /** Stat cards to render, in order; defaults to all. */
  stats?: readonly SpaceStatId[];
  onClose?: () => void;
};

const COLLECTION_TYPENAME = Type.getTypename(Collection.Collection);

/**
 * Space stats and activity matrix for the Home article: a count of objects by type and a count of
 * changes by local day, both answered by the host from index rows, so no object is loaded to draw them.
 */
export const SpaceHomeDashboard = ({ space, stats = STAT_IDS, onClose }: SpaceHomeDashboardProps) => {
  const { t } = useTranslation(meta.profile.key);
  const members = useMembers(space?.key);

  const manager = usePluginManager();
  const core = useAtomValue(manager.core);
  const enabled = useAtomValue(manager.enabled);
  const plugins = useMemo(() => enabled.filter((id) => !core.includes(id)).length, [core, enabled]);

  const dailyQuery = useMemo(() => dailyActivityQuery(Intl.DateTimeFormat().resolvedOptions().timeZone), []);
  const counts = useQuery(space?.db, SPACE_STATS_QUERY);
  const days = useQuery(space?.db, dailyQuery);
  const activity = useMemo(() => toActivity(days), [days]);

  const values: Record<SpaceStatId, number> = {
    'objects': countObjects(counts),
    'types': countTypenames(counts),
    'collections': countObjects(counts, COLLECTION_TYPENAME),
    'members': members.length,
    'active-days': activity.length,
    'plugins': plugins,
  };

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
            <Dashboard.StatValue value={values[id]} data-testid={`space-home-dashboard.${id}`} />
          </Dashboard.Stat>
        ))}
      </Dashboard.Stats>
      {/* Smaller cells so a full year fits the 40rem home column without horizontal scroll. */}
      <Dashboard.Activity classNames='[--dx-dashboard-cell:0.75rem]' data={activity} endDate={new Date()} />
    </HomeSection.Root>
  );
};

SpaceHomeDashboard.displayName = 'SpaceHomeDashboard';
