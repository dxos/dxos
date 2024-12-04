//
// Copyright 2024 DXOS.org
//

import React, { useCallback, useEffect, useState } from 'react';

import { StatusBar } from '@dxos/plugin-status-bar';
import { useClient } from '@dxos/react-client';
import { type SpaceId } from '@dxos/react-client/echo';
import { Icon, Input, Popover, useTranslation } from '@dxos/react-ui';
import { type ThemedClassName } from '@dxos/react-ui';
import { SyntaxHighlighter } from '@dxos/react-ui-syntax-highlighter';
import { mx } from '@dxos/react-ui-theme';

import { SpaceRowContainer, SYNC_STALLED_TIMEOUT } from './Space';
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
      <Popover.Root>
        <Popover.Trigger asChild>
          <StatusBar.Button title={title}>{icon}</StatusBar.Button>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content sideOffset={16}>
            <SyncStatusDetail state={state} summary={summary} debug={false} />
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    );
  }
};

export type SyncStatusDetailProps = ThemedClassName<{
  state: SpaceSyncStateMap;
  summary: PeerSyncState;
  debug?: boolean;
}>;

// TODO(wittjosiah): This currently does not show `differentDocuments` at all.
export const SyncStatusDetail = ({ classNames, state, summary, debug }: SyncStatusDetailProps) => {
  const [showAll, setShowAll] = useState(false);
  const { t } = useTranslation(SPACE_PLUGIN);
  const entries = Object.entries(state)
    .filter(([_, value]) => showAll || value.missingOnLocal + value.missingOnRemote > 0)
    .toSorted(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));

  const handleCheckedChange = useCallback((state: boolean) => setShowAll(state), [setShowAll]);

  // TODO(burdon): Normalize to max document count?
  return (
    <div className={mx('flex flex-col gap-3 p-2 text-xs min-w-96', classNames)}>
      <div role='none' className='flex items-center'>
        <h1 className='flex-1'>{t('sync status title')}</h1>
        <div className='flex items-center gap-2'>
          <Input.Root>
            <Input.Label classNames='text-xs'>{t('show all label')}</Input.Label>
            <Input.Checkbox checked={showAll} onCheckedChange={handleCheckedChange} />
          </Input.Root>
        </div>
      </div>
      <div className='flex flex-col gap-2'>
        {entries.length === 0 && (
          <div role='none' className='flex justify-center'>
            {/* TODO(wittjosiah): This text should be updated once status includes different documents. */}
            {t('no sync status label')}
          </div>
        )}
        {entries.map(([spaceId, state]) => (
          <SpaceRowContainer key={spaceId} spaceId={spaceId as SpaceId} state={state} />
        ))}
      </div>
      {debug && <SyntaxHighlighter language='json'>{JSON.stringify(summary, null, 2)}</SyntaxHighlighter>}
    </div>
  );
};
