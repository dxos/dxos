//
// Copyright 2025 DXOS.org
//

import * as Match from 'effect/Match';
import React from 'react';

import { Process } from '@dxos/functions';
import { Icon, IconButton, ScrollArea, Treegrid } from '@dxos/react-ui';
import { composable, composableProps, mx } from '@dxos/ui-theme';

export type ProcessTreeProps = {
  processes: readonly Process.Info[];
  onProcessSelect?: (process: Process.Info) => void;
  onProcessTerminate?: (process: Process.Info) => void;
};

export const ProcessTree = composable<HTMLDivElement, ProcessTreeProps>(
  ({ processes, onProcessSelect, onProcessTerminate, ...props }, forwardedRef) => {
    const filteredProcesses: Process.Info[] = [
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
            {filteredProcesses
              .filter((process) => process.parentPid === null)
              .map((process) => {
                const activeChildren = filteredProcesses.filter(
                  (candidate) =>
                    candidate.parentPid?.toString() === process.pid.toString() &&
                    candidate.state === Process.State.RUNNING,
                );
                return (
                  <Treegrid.Row
                    key={process.pid.toString()}
                    id={process.pid.toString()}
                    parentOf={process.parentPid?.toString()}
                  >
                    <Treegrid.Cell
                      indent
                      classNames={mx(
                        'grid grid-cols-[min-content_1fr_min-content] items-center gap-1 min-w-0',
                        onProcessSelect && 'dx-hover',
                      )}
                      onClick={() => onProcessSelect?.(process)}
                    >
                      <div role='none' className='p-1'>
                        <Icon
                          size={4}
                          classNames={mx(
                            process.state === Process.State.RUNNING && 'animate-spin',
                            process.state === Process.State.FAILED && 'text-error-text',
                            process.state === Process.State.SUCCEEDED && 'text-success-text',
                          )}
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
                        />
                      </div>
                      <div role='none' className='flex items-center gap-2 text-xs overflow-hidden'>
                        {/* TODO(burdon): Name is too long (and not informative). */}
                        <span className='truncate text-description'>{process.params.name}</span>
                        {/* {activeChildren.length > 0 && (
                          <span className='text-xs text-description ml-1'>{activeChildren[0].params.name}</span>
                        )} */}
                      </div>
                      {onProcessTerminate && (
                        <IconButton
                          classNames='min-h-0 p-1'
                          icon='ph--x--regular'
                          iconOnly
                          variant='ghost'
                          size={4}
                          label='Actions'
                          onClick={() => onProcessTerminate?.(process)}
                        />
                      )}
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
