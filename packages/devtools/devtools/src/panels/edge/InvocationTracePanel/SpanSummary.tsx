//
// Copyright 2025 DXOS.org
//

import { formatDate } from 'date-fns/format';
import React, { type FC, useEffect, useMemo, useState } from 'react';

import { type Database } from '@dxos/react-client/echo';
import { type ChromaticPalette, IconButton, Tag } from '@dxos/react-ui';

import { type InvocationSpan, useFunctionNameResolver } from './hooks';
import { formatDuration } from './utils';

const OutcomeColor: Record<'pending' | 'success' | 'failure', ChromaticPalette> = {
  pending: 'blue',
  success: 'emerald',
  failure: 'red',
};

type SpanSummaryProps = {
  db?: Database.Database;
  span: InvocationSpan;
  onClose: () => void;
};

export const SpanSummary: FC<SpanSummaryProps> = ({ db, span, onClose }) => {
  const [currentDuration, setCurrentDuration] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (!span) {
      return;
    }

    const isInProgress = span.outcome === undefined;
    if (!isInProgress) {
      setCurrentDuration(span.duration);
      return;
    }

    setCurrentDuration(Date.now() - span.timestamp);
    const interval = setInterval(() => setCurrentDuration(Date.now() - span.timestamp), 100);
    return () => clearInterval(interval);
  }, [span]);

  const resolver = useFunctionNameResolver({ db });
  const targetName = useMemo(() => span.name ?? (span.key ? resolver(span.key) : undefined), [span, resolver]);

  const timestamp = useMemo(() => formatDate(span.timestamp, 'yyyy-MM-dd HH:mm:ss'), [span.timestamp]);
  const outcomeKey = span.outcome ?? 'pending';
  const outcomeColor = useMemo(() => OutcomeColor[outcomeKey] ?? 'neutral', [outcomeKey]);
  const outcomeLabel = useMemo(() => outcomeKey.charAt(0).toUpperCase() + outcomeKey.slice(1), [outcomeKey]);

  return (
    <div className='p-2 overflow-auto' role='none'>
      <div className='flex justify-between items-start' role='none'>
        <div className='w-full flex flex-row justify-between' role='none'>
          <h3 className='text-lg font-medium mb-1'>{targetName ?? span.key ?? span.pid}</h3>
          <IconButton icon='ph--x--regular' iconOnly label='Close panel' onClick={onClose} />
        </div>
        <div className='flex gap-2 items-center' role='none'>
          <Tag palette={outcomeColor}>{outcomeLabel}</Tag>
          <span className='text-sm text-neutral'>{timestamp}</span>
          <span className='text-sm'>{currentDuration && `${formatDuration(currentDuration)}s`}</span>
        </div>
      </div>

      {span.error && <div className='my-2 text-sm font-medium'>{span.error}</div>}

      {span.input != null && typeof span.input === 'object' && Object.keys(span.input as object).length > 0 && (
        <div className='mt-3'>
          <details className='text-sm'>
            <summary className='cursor-pointer font-medium'>Input Data</summary>
            <pre className='mt-2 p-2 bg-neutral/5 rounded-sm text-xs overflow-auto'>
              {JSON.stringify(span.input, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
};
