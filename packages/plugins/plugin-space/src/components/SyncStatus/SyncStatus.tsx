//
// Copyright 2024 DXOS.org
//

import React, { useEffect, useState } from 'react';

import { StatusBar } from '@dxos/plugin-status-bar';
import { useClient } from '@dxos/react-client';
import { type SpaceSyncStateMap, getSyncSummary, useSyncState } from '@dxos/react-client/echo';
import { Icon, useTranslation, Popover } from '@dxos/react-ui';
import { useStream } from '@dxos/react-client/devtools';

import { meta } from '../../meta';

import { createClientSaveTracker } from './save-tracker';
import { getIcon, getStatus } from './status';
import { EdgeStatus } from '@dxos/protocols/proto/dxos/client/services';
import type { QueryEdgeStatusResponse } from '@dxos/protocols/proto/dxos/client/services';
import { Unit } from '@dxos/util';

const SYNC_STALLED_TIMEOUT = 5_000;

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

export const SyncStatusIndicator = ({ state, saved }: { state: SpaceSyncStateMap; saved: boolean }) => {
  const { t } = useTranslation(meta.id);
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

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <StatusBar.Item title={title}>{icon}</StatusBar.Item>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content>
          <EdgeConnectionPopover />
          <Popover.Arrow />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
};

const useEdgeStatus = (): EdgeStatus | undefined => {
  const client = useClient();
  const { status } = useStream(
    () => client.services.services.EdgeAgentService!.queryEdgeStatus(),
    {} as QueryEdgeStatusResponse,
  );
  return status;
};

const EdgeConnectionPopover = () => {
  const status = useEdgeStatus();
  const { t } = useTranslation(meta.id);

  const isConnected = status?.state === EdgeStatus.ConnectionState.CONNECTED;

  return (
    <div className='p-3 min-w-[240px]'>
      {/* Connection Status Header */}
      <div className='flex items-center gap-2 mb-3 pb-2 border-b border-neutral-100 dark:border-neutral-800'>
        <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-success-500 animate-pulse' : 'bg-error-500'}`} />
        <span className='font-medium text-sm text-neutral-900 dark:text-neutral-100'>
          {isConnected ? t('Edge connected') : t('Edge disconnected')}
        </span>
      </div>

      {/* Connection Details */}
      {status?.state === EdgeStatus.ConnectionState.NOT_CONNECTED && (
        <div className='flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400'>
          <Icon icon='ph--cloud-x--regular' size={4} />
          <span>{t('No connection to edge service')}</span>
        </div>
      )}

      {status?.state === EdgeStatus.ConnectionState.CONNECTED && (
        <div className='space-y-2'>
          {/* Latency */}
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400'>
              <Icon icon='ph--timer--regular' size={4} />
              <span>{t('Latency')}</span>
            </div>
            <span className='text-sm font-mono text-neutral-900 dark:text-neutral-100'>{status.rtt.toFixed(0)} ms</span>
          </div>

          {/* Upload Speed */}
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400'>
              <Icon icon='ph--arrow-up--regular' size={4} />
              <span>{t('Upload')}</span>
            </div>
            <span className='text-sm font-mono text-neutral-900 dark:text-neutral-100'>
              {Unit.Kilobyte(status.rateBytesUp, 0)} kb/s
            </span>
          </div>

          {/* Download Speed */}
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400'>
              <Icon icon='ph--arrow-down--regular' size={4} />
              <span>{t('Download')}</span>
            </div>
            <span className='text-sm font-mono text-neutral-900 dark:text-neutral-100'>
              {Unit.Kilobyte(status.rateBytesDown, 0)} kb/s
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
