//
// Copyright 2025 DXOS.org
//

import * as Match from 'effect/Match';
import React from 'react';

import { Process } from '@dxos/functions-runtime';
import { Icon, ScrollArea, Treegrid } from '@dxos/react-ui';
import { composable, composableProps, mx } from '@dxos/ui-theme';

export type ProceesTreeProps = {
  processes: readonly Process.Info[];
  onProcessSelect?: (process: Process.Info) => void;
};

export const ProcessTree = composable<HTMLDivElement, ProceesTreeProps>(
  ({ processes, onProcessSelect, ...props }, forwardedRef) => {
    const fileterdProcesses: Process.Info[] = [
      ...processes.filter((process) => [Process.State.RUNNING, Process.State.HYBERNATING].includes(process.state)),
      ...processes.filter((process) => [Process.State.IDLE].includes(process.state)).slice(0, 3),
      ...processes
        .filter((process) =>
          [Process.State.SUCCEEDED, Process.State.FAILED, Process.State.TERMINATED].includes(process.state),
        )
        .slice(0, 3),
    ];

    return (
      <ScrollArea.Root {...composableProps(props, { classNames: 'dx-expander' })} thin ref={forwardedRef}>
        <ScrollArea.Viewport>
          <Treegrid.Root gridTemplateColumns='1fr'>
            {fileterdProcesses
              .filter((process) => process.parentPid === null)
              .map((process) => {
                const activeChildren = fileterdProcesses.filter(
                  (p) => p.parentPid?.toString() === process.pid.toString() && p.state === Process.State.RUNNING,
                );
                return (
                  <Treegrid.Row
                    key={process.pid.toString()}
                    id={process.pid.toString()}
                    parentOf={process.parentPid?.toString()}
                  >
                    <Treegrid.Cell
                      indent
                      classNames='flex items-center p-1 gap-2 min-w-0'
                      onClick={() => onProcessSelect?.(process)}
                    >
                      <Icon
                        size={4}
                        icon={Match.value(process.state).pipe(
                          Match.when(Process.State.RUNNING, () => 'ph--spinner-gap--regular'),
                          Match.when(Process.State.SUCCEEDED, () => 'ph--check-circle--regular'),
                          Match.when(Process.State.FAILED, () => 'ph--warning--regular'),
                          Match.when(Process.State.HYBERNATING, () => 'ph--spinner--regular'),
                          Match.when(Process.State.IDLE, () => 'ph--hourglass--regular'),
                          Match.when(Process.State.TERMINATING, () => 'ph--x-circle--regular'),
                          Match.when(Process.State.TERMINATED, () => 'ph--x-circle--regular'),
                          Match.orElse(() => 'ph--spinner-gap--regular'),
                        )}
                        classNames={mx(
                          process.state === Process.State.RUNNING && 'animate-spin',
                          process.state === Process.State.FAILED && 'text-error-text',
                          process.state === Process.State.SUCCEEDED && 'text-success-text',
                        )}
                      />
                      <div role='none' className='flex items-center gap-2 text-xs overflow-hidden'>
                        <span className='text-description'>{process.params.name}</span>
                        {activeChildren.length > 0 && (
                          <span className='text-xs text-description ml-1'>{activeChildren[0].params.name}</span>
                        )}
                      </div>
                    </Treegrid.Cell>
                  </Treegrid.Row>
                );
              })}
          </Treegrid.Root>
        </ScrollArea.Viewport>
      </ScrollArea.Root>
    );
  },
);
