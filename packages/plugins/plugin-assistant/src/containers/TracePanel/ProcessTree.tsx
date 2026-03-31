//
// Copyright 2025 DXOS.org
//

import * as Match from 'effect/Match';
import React from 'react';

import { Process } from '@dxos/functions-runtime';
import { Icon, Treegrid } from '@dxos/react-ui';

export const ProcessTree = ({ processes }: { processes: readonly Process.Info[] }) => {
  return (
    <Treegrid.Root gridTemplateColumns='min-content 1fr'>
      {processes.map((process) => (
        <Treegrid.Row
          key={process.pid.toString()}
          id={process.pid.toString()}
          parentOf={process.parentPid?.toString()}
          classNames='gap-1'
        >
          <Treegrid.Cell>
            <Icon
              icon={Match.value(process.state).pipe(
                Match.when(Process.State.RUNNING, () => 'ph--spinner-gap--regular'),
                Match.when(Process.State.SUCCEEDED, () => 'ph--check-circle--regular'),
                Match.when(Process.State.FAILED, () => 'ph--warning--regular'),
                Match.when(Process.State.HYBERNATING, () => 'ph--spinner--regular'),
                Match.when(Process.State.IDLE, () => 'ph--houglass--regular'),
                Match.when(Process.State.TERMINATING, () => 'ph--x-circle--regular'),
                Match.when(Process.State.TERMINATED, () => 'ph--x-circle--regular'),
                Match.orElse(() => 'ph--spinner-gap--regular'),
              )}
              classNames='w-4 h-4'
            />
          </Treegrid.Cell>
          <Treegrid.Cell>
            <div className='text-xs overflow-hidden text-ellipsis'> {process.params.name}</div>
          </Treegrid.Cell>
        </Treegrid.Row>
      ))}
    </Treegrid.Root>
  );
};
