//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import React, { useDeferredValue, useMemo } from 'react';

import { HomeSection, usePluginManager } from '@dxos/app-framework/ui';
import { Collection, Type } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { type Space, useMembers } from '@dxos/react-client/echo';
import { useTranslation } from '@dxos/react-ui';
import { Dashboard } from '@dxos/react-ui-dashboard';

import { SPACE_STATS_QUERY, typenameOf } from '#dashboard';
import { meta } from '#meta';

import { toActivity } from './activity.ts';

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
 * Space stats and activity matrix for the Home article. The counts come from a host-side type
 * aggregate and the matrix from the space's activity ledger (changes per hour, kept by the
 * indexer), so no object is loaded into the tab to draw either.
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
  const ledger = useMemo(() => space.db.activity(), [space]);
  const hours = useDeferredValue(useAtomValue(ledger.atom));
  const activity = useMemo(() => toActivity(hours), [hours]);

  const values: Record<SpaceStatId, number> = {
    'objects': counts.reduce((total, row) => total + row.count, 0),
    'types': counts.filter((row) => row.type !== null).length,
    'collections': counts
      .filter((row) => row.type !== null && typenameOf(row.type) === COLLECTION_TYPENAME)
      .reduce((total, row) => total + row.count, 0),
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
