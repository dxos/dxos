//
// Copyright 2025 DXOS.org
//

import * as Match from 'effect/Match';
import * as Option from 'effect/Option';
import React from 'react';

import { Process } from '@dxos/compute';
import { Icon, IconButton, ScrollArea, Tooltip, Treegrid } from '@dxos/react-ui';
import { composable, composableProps } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';
import { Unit } from '@dxos/util';

export type ProcessTreeProps = {
  // TODO(burdon): Atom.
  processes: readonly Process.Info[];
  onProcessSelect?: (process: Process.Info) => void;
  onProcessTerminate?: (process: Process.Info) => void;
};

export const ProcessTree = React.memo(
  composable<HTMLDivElement, ProcessTreeProps>(
    ({ processes, onProcessSelect, onProcessTerminate, ...props }, forwardedRef) => {
      const sortedProcesses = [
        ...processes.filter((process) => [Process.State.RUNNING, Process.State.HYBERNATING].includes(process.state)),
        ...processes.filter((process) => [Process.State.IDLE].includes(process.state)).slice(0, 3),
        ...processes.filter((process) =>
          [Process.State.SUCCEEDED, Process.State.FAILED, Process.State.TERMINATED].includes(process.state),
        ),
      ].sort((a, b) => {
        const aCompletedAt = Option.getOrElse(a.completedAt, () => Infinity);
        const bCompletedAt = Option.getOrElse(b.completedAt, () => Infinity);
        return bCompletedAt - aCompletedAt;
      });

      return (
        <ScrollArea.Root {...composableProps(props, { classNames: 'dx-expander' })} thin ref={forwardedRef}>
          <ScrollArea.Viewport>
            <Treegrid.Root classNames='grid grid-cols-[min-content_1fr_min-content_min-content]'>
              {sortedProcesses
                .filter((process) => process.parentPid === null)
                .map((process) => {
                  // const activeChildren = filteredProcesses.filter(
                  //   (candidate) =>
                  //     candidate.parentPid?.toString() === process.pid.toString() &&
                  //     candidate.state === Process.State.RUNNING,
                  // );
                  const t = Unit.Duration(process.metrics.wallTime);
                  return (
                    <Treegrid.Row
                      key={process.pid.toString()}
                      id={process.pid.toString()}
                      parentOf={process.parentPid?.toString()}
                      classNames={mx('col-span-full grid grid-cols-subgrid gap-2 ps-1', onProcessSelect && 'dx-hover')}
                    >
                      <Treegrid.Cell classNames='grid place-items-center'>
                        <Tooltip.Trigger content={process.state.toString()}>
                          <Icon
                            size={4}
                            synchronized
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
                              Match.when(Process.State.IDLE, () => 'ph--moon-stars--regular'),
                              Match.when(Process.State.TERMINATING, () => 'ph--x-circle--regular'),
                              Match.when(Process.State.TERMINATED, () => 'ph--x-circle--regular'),
                              Match.orElse(() => 'ph--spinner-gap--regular'),
                            )}
                          />
                        </Tooltip.Trigger>
                      </Treegrid.Cell>
                      <Treegrid.Cell classNames='flex items-center truncate' onClick={() => onProcessSelect?.(process)}>
                        <span
                          className={mx(
                            'truncate text-sm',
                            process.state !== Process.State.RUNNING && 'text-description',
                          )}
                        >
                          {process.params.name ?? process.pid.toString()}
                        </span>
                      </Treegrid.Cell>
                      <Treegrid.Cell classNames='flex items-center justify-end text-xs text-description tabular-nums'>
                        {[Process.State.FAILED, Process.State.SUCCEEDED].includes(process.state) && (
                          <span className='whitespace-nowrap'>{t.toString()}</span>
                        )}
                      </Treegrid.Cell>
                      <Treegrid.Cell>
                        {onProcessTerminate && (
                          <IconButton
                            classNames='min-h-0 p-1'
                            icon='ph--x--regular'
                            iconOnly
                            variant='ghost'
                            size={4}
                            label='Actions'
                            onClick={(event) => {
                              event.stopPropagation();
                              onProcessTerminate?.(process);
                            }}
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
  ),
);
