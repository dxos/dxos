//
// Copyright 2025 DXOS.org
//

import React, { useEffect, useState, useMemo } from 'react';

import { decodeReference } from '@dxos/echo-protocol';
import { type InvocationSpan, InvocationOutcome } from '@dxos/functions/types';
import { type Space } from '@dxos/react-client/echo';
import { IconButton, Tag } from '@dxos/react-ui';

import { useScriptNameResolver } from './hooks';
import { formatDuration } from './utils';

type SpanSummaryProps = { span: InvocationSpan; space?: Space; onClose: () => void };

export const SpanSummary: React.FC<SpanSummaryProps> = ({ span, space, onClose }) => {
  const [currentDuration, setCurrentDuration] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (!span) {
      return;
    }

    const isInProgress = span.outcome === 'in-progress';
    if (!isInProgress) {
      setCurrentDuration(span.durationMs);
      return;
    }
    setCurrentDuration(Date.now() - span.timestampMs);

    const interval = setInterval(() => setCurrentDuration(Date.now() - span.timestampMs), 100);
    return () => clearInterval(interval);
  }, [span]);

  const targetDxn = useMemo(() => decodeReference(span.invocationTarget).dxn, [span.invocationTarget]);
  const resolver = useScriptNameResolver({ space });
  const targetName = useMemo(() => resolver(targetDxn), [targetDxn, resolver]);

  const timestamp = useMemo(() => new Date(span.timestampMs).toLocaleString(), [span.timestampMs]);
  const isInProgress = useMemo(() => span.outcome === 'in-progress', [span.outcome]);
  const outcomeColor = useMemo(() => {
    if (isInProgress) {
      return 'blue';
    }
    return span.outcome === InvocationOutcome.SUCCESS ? 'emerald' : 'red';
  }, [isInProgress, span.outcome]);

  const outcomeLabel = useMemo(() => {
    if (isInProgress) {
      return 'In Progress';
    }
    return span.outcome.charAt(0).toUpperCase() + span.outcome.slice(1);
  }, [isInProgress, span.outcome]);

  return (
    <div className='p-2 overflow-auto'>
      <div className='is-flex justify-between items-start'>
        <div className='is-full flex flex-row justify-between'>
          <h3 className='text-lg font-medium mb-1'>{targetName}</h3>
          <IconButton icon='ph--x--regular' iconOnly label='Close panel' onClick={onClose} />
        </div>
        <div className='flex gap-2 items-center'>
          <Tag palette={outcomeColor}>{outcomeLabel}</Tag>
          <span className='text-sm text-neutral'>{timestamp}</span>
          <span className='text-sm'>{currentDuration && `${formatDuration(currentDuration)}s`}</span>
        </div>

        {span.trigger && (
          <Tag palette='amber'>
            Triggered{' '}
            <span className='opacity-80'>{decodeReference(span.trigger).dxn?.toString().split(':').pop()}</span>
          </Tag>
        )}
      </div>

      {span.exception && (
        <div className='mlb-2 text-sm font-medium'>
          {span.exception.name}: {span.exception.message}
        </div>
      )}

      {Object.keys(span.input).length > 0 && (
        <div className='mt-3'>
          <details className='text-sm'>
            <summary className='cursor-pointer font-medium'>Input Data</summary>
            <pre className='mt-2 p-2 bg-neutral/5 rounded text-xs overflow-auto'>
              {JSON.stringify(span.input, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
};
