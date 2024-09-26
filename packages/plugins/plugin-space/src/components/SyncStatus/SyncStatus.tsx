//
// Copyright 2024 DXOS.org
//

import React, { type HTMLAttributes } from 'react';

import { StatusBar } from '@dxos/plugin-status-bar';
import { Icon, Popover } from '@dxos/react-ui';
import { type ThemedClassName } from '@dxos/react-ui';
import { SyntaxHighlighter } from '@dxos/react-ui-syntax-highlighter';
import { mx } from '@dxos/react-ui-theme';

import { type Progress, type SpaceSyncStateMap, type SyncStateSummary, getSyncSummary, useSyncState } from './types';

export const SyncStatus = () => {
  const state = useSyncState();
  return <SyncStatusIndicator state={state} />;
};

export const SyncStatusIndicator = ({ state }: { state: SpaceSyncStateMap }) => {
  const summary = getSyncSummary(state);
  const offline = false;
  const needsToUpload = summary.differentDocuments > 0 || summary.missingOnRemote > 0;
  const needsToDownload = summary.differentDocuments > 0 || summary.missingOnLocal > 0;

  return (
    <StatusBar.Item>
      <Popover.Root>
        <Popover.Trigger>
          <Icon
            icon={
              offline
                ? 'ph--cloud-x--regular'
                : needsToUpload
                  ? 'ph--cloud-arrow-up--regular'
                  : needsToDownload
                    ? 'ph--cloud-arrow-down--regular'
                    : 'ph--cloud-check--regular'
            }
            size={4}
          />
        </Popover.Trigger>
        <Popover.Content>
          <SyncStatusDetail state={state} summary={summary} debug />
        </Popover.Content>
      </Popover.Root>
    </StatusBar.Item>
  );
};

export const SyncStatusDetail = ({
  state,
  summary,
  debug,
}: {
  state: SpaceSyncStateMap;
  summary: SyncStateSummary;
  debug?: boolean;
}) => {
  // TODO(burdon): Normalize to max document count.
  return (
    <div className='flex flex-col text-xs'>
      <h1 className='p-2'>Progress</h1>
      <div className='flex flex-col gap-0.5'>
        {Object.entries(state).map(
          ([spaceId, { localDocumentCount, remoteDocumentCount, missingOnLocal, missingOnRemote }]) => (
            <Candle
              key={spaceId}
              classNames='h-2'
              up={{ count: remoteDocumentCount, total: remoteDocumentCount + missingOnRemote }}
              down={{ count: localDocumentCount, total: localDocumentCount + missingOnLocal }}
              title={spaceId}
            />
          ),
        )}
      </div>
      {debug && <SyntaxHighlighter language='json'>{JSON.stringify(summary, null, 2)}</SyntaxHighlighter>}
    </div>
  );
};

type CandleProps = ThemedClassName<Pick<HTMLAttributes<HTMLDivElement>, 'title'>> & { up: Progress; down: Progress };

export const Candle = ({ classNames, up, down }: CandleProps) => {
  return (
    <div className={mx('flex divide-x-2 divide-separator', classNames)}>
      <Bar classNames='flex w-1/2 justify-end' {...up} />
      <Bar classNames='flex w-1/2' {...down} />
    </div>
  );
};

export const Bar = ({ classNames, count, total }: ThemedClassName<Progress>) => {
  const p = (count / total) * 100;
  return (
    <div className={mx('flex w-full bg-green-900', classNames)}>
      <div className='shrink-0 bg-green-500' style={{ width: `${p}%` }}></div>
    </div>
  );
};
