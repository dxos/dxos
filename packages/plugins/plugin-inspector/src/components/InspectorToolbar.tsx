//
// Copyright 2026 DXOS.org
//

import React, { useMemo } from 'react';

import { Process } from '@dxos/functions-runtime';
import { Button, Icon } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { type InspectorStep } from '#types';

export type InspectorToolbarProps = {
  processes: readonly Process.Info[];
  steps: InspectorStep[];
  onStop?: () => void;
  onClear?: () => void;
};

const formatTokens = (count: number): string => {
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}k`;
  }
  return String(count);
};

/**
 * Inspector header with live status and controls.
 */
export const InspectorToolbar = ({ processes, steps, onStop, onClear }: InspectorToolbarProps) => {
  const activeProcess = processes.find(
    (process) => process.state === Process.State.RUNNING || process.state === Process.State.HYBERNATING,
  );
  const isRunning = !!activeProcess;

  const { totalTokens, totalDuration, totalCalls } = useMemo(() => {
    let tokens = 0;
    let duration = 0;
    let calls = 0;
    for (const step of steps) {
      if (step.tokens) {
        tokens += (step.tokens.input ?? 0) + (step.tokens.output ?? 0);
      }
      if (step.duration) {
        duration += step.duration;
      }
      if (step.type === 'tool-call') {
        calls++;
      }
    }
    return { totalTokens: tokens, totalDuration: duration, totalCalls: calls };
  }, [steps]);

  return (
    <div className='flex items-center gap-2 px-2 py-1.5 border-b border-separator'>
      {/* Status indicator. */}
      <div className='flex items-center gap-1.5'>
        {isRunning ? (
          <>
            <div className='size-2 rounded-full bg-green-500 animate-pulse' />
            <span className='text-xs font-medium text-green-600 dark:text-green-400'>Live</span>
          </>
        ) : steps.length > 0 ? (
          <>
            <div className='size-2 rounded-full bg-neutral-400' />
            <span className='text-xs text-description'>Idle</span>
          </>
        ) : (
          <>
            <Icon icon='ph--magnifying-glass--regular' size={3} classNames='text-description' />
            <span className='text-xs text-description'>Inspector</span>
          </>
        )}
      </div>

      <div className='flex-1' />

      {/* Metrics. */}
      {steps.length > 0 && (
        <div className='flex items-center gap-2 text-[10px] text-description tabular-nums'>
          {totalCalls > 0 && (
            <span className='flex items-center gap-0.5'>
              <Icon icon='ph--lightning--regular' size={2.5} />
              {totalCalls}
            </span>
          )}
          {totalTokens > 0 && (
            <span className='flex items-center gap-0.5'>
              <Icon icon='ph--hash--regular' size={2.5} />
              {formatTokens(totalTokens)}
            </span>
          )}
          {totalDuration > 0 && (
            <span>{(totalDuration / 1000).toFixed(1)}s</span>
          )}
        </div>
      )}

      {/* Controls. */}
      {onClear && steps.length > 0 && (
        <Button variant='ghost' classNames='p-0.5' onClick={onClear} title='Clear'>
          <Icon icon='ph--trash--regular' size={3} />
        </Button>
      )}
      {onStop && isRunning && (
        <Button variant='ghost' classNames={mx('p-0.5', 'text-error')} onClick={onStop} title='Stop agent'>
          <Icon icon='ph--stop--fill' size={3} />
        </Button>
      )}
    </div>
  );
};
