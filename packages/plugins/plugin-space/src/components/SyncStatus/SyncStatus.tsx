//
// Copyright 2024 DXOS.org
//

import React, { useEffect, useState } from 'react';

import { StatusBar } from '@dxos/plugin-status-bar';
import { useClient } from '@dxos/react-client';
import { Icon, Popover, useTranslation } from '@dxos/react-ui';
import { type ThemedClassName } from '@dxos/react-ui';
import { SyntaxHighlighter } from '@dxos/react-ui-syntax-highlighter';
import { mx } from '@dxos/react-ui-theme';

import { SpaceRow, SYNC_STALLED_TIMEOUT } from './Space';
import { createClientSaveTracker } from './save-tracker';
import { getIcon, getStatus } from './status';
import { type PeerSyncState, type SpaceSyncStateMap, getSyncSummary, useSyncState } from './sync-state';
import { SPACE_PLUGIN } from '../../meta';

export const SyncStatus = () => {
  const client = useClient();
  const state = useSyncState();
  const [saved, setSaved] = useState(true);

  useEffect(() => {
    return createClientSaveTracker(client, (state) => {
      setSaved(state === 'saved');
    });
  }, []);

  return <SyncStatusIndicator state={state} saved={saved} />;
};

export const SyncStatusIndicator = ({ state, saved }: { state: SpaceSyncStateMap; saved: Boolean }) => {
  const { t } = useTranslation(SPACE_PLUGIN);
  const summary = getSyncSummary(state);
  const offline = Object.values(state).length === 0;
  const needsToUpload = summary.differentDocuments > 0 || summary.missingOnRemote > 0;
  const needsToDownload = summary.differentDocuments > 0 || summary.missingOnLocal > 0;
  const status = getStatus({ offline, saved, needsToUpload, needsToDownload });

  const [classNames, setClassNames] = useState<string>();
  useEffect(() => {
    setClassNames(undefined);
    if (offline || (!needsToUpload && !needsToDownload)) {
      return;
    }

    const t = setTimeout(() => {
      // TODO(wittjosiah): Use semantic color tokens.
      setClassNames('text-orange-500');
    }, SYNC_STALLED_TIMEOUT);
    return () => clearTimeout(t);
  }, [offline, needsToUpload, needsToDownload]);

  const title = t(`${status} label`);
  const icon = <Icon icon={getIcon(status)} size={4} classNames={classNames} />;

  if (offline) {
    return <StatusBar.Item title={title}>{icon}</StatusBar.Item>;
  } else {
    return (
      <StatusBar.Item title={title}>
        <Popover.Root>
          <Popover.Trigger>{icon}</Popover.Trigger>
          <Popover.Content sideOffset={16}>
            <SyncStatusDetail state={state} summary={summary} debug={false} />
          </Popover.Content>
        </Popover.Root>
      </StatusBar.Item>
    );
  }
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
