//
// Copyright 2024 DXOS.org
//

import React, { type HTMLAttributes, useEffect, useState } from 'react';

import { StatusBar } from '@dxos/plugin-status-bar';
import { Icon, Popover, useTranslation } from '@dxos/react-ui';
import { type ThemedClassName } from '@dxos/react-ui';
import { SyntaxHighlighter } from '@dxos/react-ui-syntax-highlighter';
import { mx } from '@dxos/react-ui-theme';

import { type Progress, type PeerSyncState, type SpaceSyncStateMap, getSyncSummary, useSyncState } from './types';
import { SPACE_PLUGIN } from '../../meta';

const SYNC_STALLED_TIMEOUT = 5_000;

const styles = {
  barBg: 'bg-neutral-50 dark:bg-green-900 text-black',
  barFg: 'bg-neutral-100 bg-green-500',
  barHover: 'dark:hover:bg-green-500',
};

export const SyncStatus = () => {
  const state = useSyncState();
  return <SyncStatusIndicator state={state} />;
};

export const SyncStatusIndicator = ({ state }: { state: SpaceSyncStateMap }) => {
  const summary = getSyncSummary(state);
  const offline = false;

  const needsToUpload = summary.differentDocuments > 0 || summary.missingOnRemote > 0;
  const needsToDownload = summary.differentDocuments > 0 || summary.missingOnLocal > 0;
  const [classNames, setClassNames] = useState<string>();
  useEffect(() => {
    setClassNames(undefined);
    if (!needsToUpload && !needsToDownload) {
      return;
    }

    const t = setTimeout(() => {
      setClassNames('text-orange-500');
    }, SYNC_STALLED_TIMEOUT);
    return () => clearTimeout(t);
  }, [needsToUpload, needsToDownload]);

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
            classNames={classNames}
          />
        </Popover.Trigger>
        <Popover.Content sideOffset={16}>
          <SyncStatusDetail state={state} summary={summary} debug={false} />
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
  summary: PeerSyncState;
  debug?: boolean;
}>) => {
  const { t } = useTranslation(SPACE_PLUGIN);
  const entries = Object.entries(state).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));

  // TODO(burdon): Normalize to max document count?
  return (
    <div className={mx('flex flex-col text-xs min-w-[16rem]', classNames)}>
      <h1 className='p-2'>{t('sync status title')}</h1>
      <div className='flex flex-col gap-[2px] my-[2px]'>
        {entries.map(([spaceId, state]) => (
          <SpaceRow key={spaceId} spaceId={spaceId} state={state} />
        ))}
      </div>
      {debug && <SyntaxHighlighter language='json'>{JSON.stringify(summary, null, 2)}</SyntaxHighlighter>}
    </div>
  );
};

const useActive = (count: number) => {
  const [current, setCurrent] = useState(count);
  const [active, setActive] = useState(false);
  useEffect(() => {
    let t: NodeJS.Timeout | undefined;
    if (count !== current) {
      setActive(true);
      setCurrent(count);
      t && clearTimeout(t);
      t = setTimeout(() => {
        setActive(false);
      }, SYNC_STALLED_TIMEOUT);
    }

    return () => {
      setActive(false);
      clearTimeout(t);
    };
  }, [count, current]);
  return active;
};

const SpaceRow = ({
  spaceId,
  state: { localDocumentCount, remoteDocumentCount, missingOnLocal, missingOnRemote },
}: {
  spaceId: string;
  state: PeerSyncState;
}) => {
  const downActive = useActive(localDocumentCount);
  const upActive = useActive(remoteDocumentCount);

  return (
    <div
      className={mx('flex items-center mx-[2px] gap-[2px] cursor-pointer', styles.barHover)}
      title={spaceId}
      onClick={() => {
        void navigator.clipboard.writeText(spaceId);
      }}
    >
      <Icon
        icon='ph--arrow-fat-line-left--regular'
        size={3}
        classNames={mx(downActive && 'animate-[pulse_1s_infinite]')}
      />
      <Candle
        up={{ count: remoteDocumentCount, total: remoteDocumentCount + missingOnRemote }}
        down={{ count: localDocumentCount, total: localDocumentCount + missingOnLocal }}
        title={spaceId}
      />
      <Icon
        icon='ph--arrow-fat-line-right--regular'
        size={3}
        classNames={mx(upActive && 'animate-[pulse_1s_step-start_infinite]')}
      />
    </div>
  );
};

type CandleProps = ThemedClassName<Pick<HTMLAttributes<HTMLDivElement>, 'title'>> & { up: Progress; down: Progress };

const Candle = ({ classNames, up, down }: CandleProps) => {
  return (
    <div className={mx('grid grid-cols-[1fr_2rem_1fr] w-full h-3', classNames)}>
      <Bar classNames='justify-end' {...up} />
      <div className='relative'>
        <div className={mx('absolute inset-0 flex items-center justify-center text-xs', styles.barBg)}>{up.total}</div>
      </div>
      <Bar {...down} />
    </div>
  );
};

const Bar = ({ classNames, count, total }: ThemedClassName<Progress>) => {
  let p = (count / total) * 100;
  if (count < total) {
    p = Math.min(p, 95);
  }

  return (
    <div className={mx('relative flex w-full', styles.barBg, classNames)}>
      <div className={mx('shrink-0', styles.barFg)} style={{ width: `${p}%` }}></div>
      {count !== total && (
        <div className='absolute top-0 bottom-0 flex items-center mx-0.5 text-black text-xs'>{count}</div>
      )}
    </div>
  );
};
