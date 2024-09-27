//
// Copyright 2024 DXOS.org
//

import React, { type HTMLAttributes } from 'react';

import { StatusBar } from '@dxos/plugin-status-bar';
import { Icon, Popover, useTranslation } from '@dxos/react-ui';
import { type ThemedClassName } from '@dxos/react-ui';
import { SyntaxHighlighter } from '@dxos/react-ui-syntax-highlighter';
import { mx } from '@dxos/react-ui-theme';

import { type Progress, type SpaceSyncStateMap, type SyncStateSummary, getSyncSummary, useSyncState } from './types';
import { SPACE_PLUGIN } from '../../meta';

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
  classNames,
  state,
  summary,
  debug,
}: ThemedClassName<{
  state: SpaceSyncStateMap;
  summary: SyncStateSummary;
  debug?: boolean;
}>) => {
  const { t } = useTranslation(SPACE_PLUGIN);

  // TODO(burdon): Normalize to max document count.
  return (
    <div className={mx('flex flex-col text-xs', classNames)}>
      <h1 className='p-2'>{t('sync status title')}</h1>
      <div className='flex flex-col gap-[2px] my-[2px]'>
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
    <div className={mx('grid grid-cols-[1fr_2px_1fr] mx-[2px]', classNames)}>
      <Bar classNames='justify-end' {...up} />
      <div />
      <Bar {...down} />
    </div>
  );
};

export const Bar = ({ classNames, count, total }: ThemedClassName<Progress>) => {
  const p = (count / total) * 100;
  return (
    <div className={mx('flex w-full bg-neutral-50 dark:bg-green-900', classNames)}>
      <div className='shrink-0 bg-green-500' style={{ width: `${p}%` }}></div>
    </div>
  );
};
