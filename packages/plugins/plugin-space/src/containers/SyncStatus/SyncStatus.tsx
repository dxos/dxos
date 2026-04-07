//
// Copyright 2024 DXOS.org
//

import React, { useEffect, useState } from 'react';

import { StatusBar } from '@dxos/plugin-status-bar';
import { EdgeStatus } from '@dxos/protocols/proto/dxos/client/services';
import { type QueryEdgeStatusResponse } from '@dxos/protocols/proto/dxos/client/services';
import { useClient } from '@dxos/react-client';
import { useStream } from '@dxos/react-client/devtools';
import { type SpaceSyncStateMap, getSyncSummary, useSyncState } from '@dxos/react-client/echo';
import { Icon, IconButton, Popover, useTranslation } from '@dxos/react-ui';
import { iconSize, mx } from '@dxos/ui-theme';
import { Unit, type UnitFormat } from '@dxos/util';

import { createClientSaveTracker, getIcon, getStatus } from '#components';
import { meta } from '#meta';
import { log } from '@dxos/log';

const SYNC_STALLED_TIMEOUT = 5_000;

export const SyncStatus = () => {
  const client = useClient();
  const state = useSyncState();
  const [saved, setSaved] = useState(true);
  useEffect(() => createClientSaveTracker(client, (state) => setSaved(state === 'saved')), []);

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
      log.warn('sync stalled', { state });
      // setClassNames('text-error-text');
    }, SYNC_STALLED_TIMEOUT);
    return () => clearTimeout(t);
  }, [offline, needsToUpload, needsToDownload]);

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <StatusBar.Item>
          <IconButton icon={getIcon(status)} iconOnly label={t(`${status}.label`)} classNames={classNames} />
        </StatusBar.Item>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content side='left' classNames=''>
          <EdgeConnectionPopover />
          <Popover.Arrow />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
};

const EdgeConnectionPopover = () => {
  const { t } = useTranslation(meta.id);
  const client = useClient();
  const { status } = useStream(
    () => client.services.services.EdgeAgentService!.queryEdgeStatus(),
    {} as QueryEdgeStatusResponse,
  );

  const isConnected = status?.state === EdgeStatus.ConnectionState.CONNECTED;

  return (
    <div className='flex flex-col gap-2 w-[240px] p-2' style={iconSize(4)}>
      {/* Connection Status Header */}
      <div className='flex items-center gap-2 mb-2'>
        <Icon
          icon={isConnected ? 'ph--check-circle--regular' : 'ph--warning-circle--regular'}
          classNames={mx(isConnected ? 'text-success-text' : 'text-error-text animate-pulse')}
        />
        <span className='font-medium text-sm'>
          {isConnected ? t('sync-edge-connected.label') : t('sync-edge-disconnected.label')}
        </span>
      </div>

      {/* Connection Details */}
      {status?.state === EdgeStatus.ConnectionState.NOT_CONNECTED && (
        <div className='grid grid-cols-[min-content_1fr_min-content_min-content] gap-2'>
          <Icon icon='ph--cloud-x--regular' />
          <span className='text-description'>{t('sync-no-connection.label')}</span>
        </div>
      )}

      {status?.state === EdgeStatus.ConnectionState.CONNECTED && (
        <div className='grid grid-cols-[min-content_1fr_min-content_min-content] gap-2 gap-y-1'>
          {/* Latency */}
          <div className='col-span-full grid grid-cols-subgrid gap-2 items-center text-sm'>
            <Icon icon='ph--timer--regular' />
            <span className='text-description'>{t('sync-latency.label')}</span>
            <div />
            <UnitValue value={status.rtt} format={Unit.Millisecond} />
          </div>

          {/* Upload Speed */}
          <div className='col-span-full grid grid-cols-subgrid gap-2 items-center text-sm'>
            <Icon icon='ph--arrow-up--regular' classNames='text-green-500' />
            <span className='text-description'>{t('sync-upload.label')}</span>
            <UnitValue value={status.messagesSent} format={Unit.Thousand} />
            <UnitValue value={status.rateBytesUp} format={Unit.Kilobyte} suffix='/s' />
          </div>

          {/* Download Speed */}
          <div className='col-span-full grid grid-cols-subgrid gap-2 items-center text-sm'>
            <Icon icon='ph--arrow-down--regular' classNames='text-orange-500' />
            <span className='text-description'>{t('sync-download.label')}</span>
            <UnitValue value={status.messagesReceived} format={Unit.Thousand} />
            <UnitValue value={status.rateBytesDown} format={Unit.Kilobyte} suffix='/s' />
          </div>
        </div>
      )}
    </div>
  );
};

// TODO(burdon): Factor out.
const UnitValue = ({ value: input, format, suffix }: { value: number; format: UnitFormat; suffix?: string }) => {
  const { formattedValue, unit } = format(input);
  return (
    <span className='font-mono'>
      {formattedValue}
      <span className='ms-1 text-subdued'>
        {unit.symbol}
        {suffix}
      </span>
    </span>
  );
};
