//
// Copyright 2025 DXOS.org
//

import { formatDate } from 'date-fns/format';
import React, { type FC, useEffect, useMemo, useState } from 'react';

import { type InvocationSpan } from '@dxos/functions-runtime';
import { InvocationOutcome } from '@dxos/functions-runtime';
import { type Space } from '@dxos/react-client/echo';
import { type ChromaticPalette, IconButton, Tag } from '@dxos/react-ui';

import { useFunctionNameResolver } from './hooks';
import { formatDuration } from './utils';

const InvocationColor: Record<InvocationOutcome, ChromaticPalette> = {
  [InvocationOutcome.PENDING]: 'blue',
  [InvocationOutcome.SUCCESS]: 'emerald',
  [InvocationOutcome.FAILURE]: 'red',
};

type SpanSummaryProps = {
  space?: Space;
  span: InvocationSpan;
  onClose: () => void;
};

export const SpanSummary: FC<SpanSummaryProps> = ({ space, span, onClose }) => {
  const [currentDuration, setCurrentDuration] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (!span) {
      return;
    }

    const isInProgress = span.outcome === InvocationOutcome.PENDING;
    if (!isInProgress) {
      setCurrentDuration(span.duration);
      return;
    }

    setCurrentDuration(Date.now() - span.timestamp);
    const interval = setInterval(() => setCurrentDuration(Date.now() - span.timestamp), 100);
    return () => clearInterval(interval);
  }, [span]);

  const targetDxn = useMemo(() => span.invocationTarget?.dxn, [span.invocationTarget]);
  const resolver = useFunctionNameResolver({ space });
  const targetName = useMemo(() => resolver(targetDxn), [targetDxn, resolver]);

  const timestamp = useMemo(() => formatDate(span.timestamp, 'yyyy-MM-dd HH:mm:ss'), [span.timestamp]);
  const outcomeColor = useMemo(() => InvocationColor[span.outcome] ?? 'neutral', [span.outcome]);
  const outcomeLabel = useMemo(() => span.outcome.charAt(0).toUpperCase() + span.outcome.slice(1), [span.outcome]);

  return (
    <div className='p-2 overflow-auto' role='none'>
      <div className='is-flex justify-between items-start' role='none'>
        <div className='is-full flex flex-row justify-between' role='none'>
          <h3 className='text-lg font-medium mb-1'>{targetName}</h3>
          <IconButton icon='ph--x--regular' iconOnly label='Close panel' onClick={onClose} />
        </div>
        <div className='flex gap-2 items-center' role='none'>
          <Tag palette={outcomeColor}>{outcomeLabel}</Tag>
          <span className='text-sm text-neutral'>{timestamp}</span>
          <span className='text-sm'>{currentDuration && `${formatDuration(currentDuration)}s`}</span>
        </div>

        {span.trigger && (
          <div className='mt-2 text-sm' role='none'>
            Trigger ID: <span className='font-mono'>{span.trigger.dxn?.toString().split(':').pop()}</span>
          </div>
        )}
      </div>

      {span.error && (
        <div className='mlb-2 text-sm font-medium'>
          {span.error.name}: {span.error.message}
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
