//
// Copyright 2024 DXOS.org
//

import React, { useEffect, useState } from 'react';

import { StatusBar } from '@dxos/plugin-status-bar';
import { EdgeStatus } from '@dxos/protocols/proto/dxos/client/services';
import type { QueryEdgeStatusResponse } from '@dxos/protocols/proto/dxos/client/services';
import { useClient } from '@dxos/react-client';
import { useStream } from '@dxos/react-client/devtools';
import { type SpaceSyncStateMap, getSyncSummary, useSyncState } from '@dxos/react-client/echo';
import { Icon, Popover, useTranslation } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';
import { Unit } from '@dxos/util';

import { meta } from '../../meta';

import { createClientSaveTracker } from './save-tracker';
import { getIcon, getStatus } from './status';

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
  const icon = <Icon icon={getIcon(status)} classNames={classNames} />;

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
    <div className='min-is-[240px] p-2'>
      {/* Connection Status Header */}
      <div className='flex items-center gap-2'>
        <Icon
          icon={isConnected ? 'ph--check-circle--regular' : 'ph--warning-circle--regular'}
          classNames={mx(isConnected ? 'text-successText' : 'text-errorText animate-pulse')}
        />
        <span className='font-medium text-sm text-description'>
          {isConnected ? t('sync edge connected label') : t('sync edge disconnected label')}
        </span>
      </div>

      {/* Connection Details */}
      {status?.state === EdgeStatus.ConnectionState.NOT_CONNECTED && (
        <div className='flex items-center gap-2 text-sm text-description'>
          <Icon icon='ph--cloud-x--regular' />
          <span>{t('sync no connection label')}</span>
        </div>
      )}

      {status?.state === EdgeStatus.ConnectionState.CONNECTED && (
        <div className='space-y-2'>
          {/* Latency */}
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-2 text-sm text-description'>
              <Icon icon='ph--timer--regular' />
              <span>{t('sync latency label')}</span>
            </div>
            <span className='text-sm font-mono'>{status.rtt.toFixed(0)} ms</span>
          </div>

          {/* Upload Speed */}
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-2 text-sm text-description'>
              <Icon icon='ph--arrow-up--regular' />
              <span>{t('sync upload label')}</span>
            </div>
            <span className='text-sm font-mono'>{Unit.Kilobyte(status.rateBytesUp, 0)}/s</span>
          </div>

          {/* Download Speed */}
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-2 text-sm text-description'>
              <Icon icon='ph--arrow-down--regular' />
              <span>{t('sync download label')}</span>
            </div>
            <span className='text-sm font-mono'>{Unit.Kilobyte(status.rateBytesDown, 0)}/s</span>
          </div>
        </div>
      )}
    </div>
  );
};
