//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { Surface } from '@dxos/app-framework/ui';
import { AppSurface, useActiveSpace } from '@dxos/app-toolkit/ui';
import { Routine } from '@dxos/compute';
import { Filter, Query } from '@dxos/echo';
import { useTriggerRuntimeControls } from '@dxos/plugin-routine/hooks';
import { type Space, useQuery } from '@dxos/react-client/echo';
import { Panel, Toolbar } from '@dxos/react-ui';

/**
 * Lists the space's routines, each rendered as its own article — the routine's action, its nested triggers
 * (cron, enabled, remote) and the Run affordance. Routines are created solely by the connector integration
 * (the sync toggle → `createSyncRoutine`), so this panel only observes and runs them. The toolbar owns the
 * local trigger dispatcher, which a routine's non-`remote` triggers need in order to fire on schedule.
 */
export const RoutinesModule = ({ data }: { data?: { attendableId?: string } }) => {
  const space = useActiveSpace();
  if (!space) {
    return null;
  }
  return <RoutinesModuleContainer space={space} attendableId={data?.attendableId} />;
};

const RoutinesModuleContainer = ({ space, attendableId }: { space: Space; attendableId?: string }) => {
  const routines = useQuery(
    space.db,
    Query.select(Filter.type(Routine.Routine)).debugLabel('stories-inbox.RoutinesModule'),
  );
  const { state, start, stop } = useTriggerRuntimeControls(space.db);

  return (
    <Panel.Root>
      <Panel.Toolbar asChild>
        <Toolbar.Root>
          <Toolbar.Text>Routines</Toolbar.Text>
          <Toolbar.Separator />
          <Toolbar.Button onClick={start} disabled={state?.enabled}>
            Start
          </Toolbar.Button>
          <Toolbar.Button onClick={stop} disabled={!state?.enabled}>
            Stop
          </Toolbar.Button>
        </Toolbar.Root>
      </Panel.Toolbar>
      <Panel.Content className='grid overflow-y-auto'>
        {routines.length === 0 ? (
          <div className='grid place-items-center text-sm text-description'>No routines in this space.</div>
        ) : (
          routines.map((routine) => (
            <Surface.Surface
              key={routine.id}
              type={AppSurface.Article}
              data={{ subject: routine, attendableId }}
              limit={1}
            />
          ))
        )}
      </Panel.Content>
      <Panel.Statusbar className='flex items-center gap-3 px-2 text-xs text-description'>
        <span>{state?.enabled ? 'running' : 'stopped'}</span>
        <span>runs: {state?.invocations.length ?? 0}</span>
        <span>errors: {state?.errors.length ?? 0}</span>
      </Panel.Statusbar>
    </Panel.Root>
  );
};
