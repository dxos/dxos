//
// Copyright 2024 DXOS.org
//

import React, { useEffect, useState } from 'react';

import { StatusBar } from '@dxos/plugin-status-bar/components';
import { EdgeStatus } from '@dxos/protocols/proto/dxos/client/services';
import { useClient } from '@dxos/react-client';
import { type SpaceSyncStateMap, getSyncSummary, useSyncState } from '@dxos/react-client/echo';
import { Icon, IconButton, Popover, useTranslation } from '@dxos/react-ui';
import { iconSize, mx } from '@dxos/ui-theme';
import { Unit, type UnitFormat } from '@dxos/util';

import { createClientSaveTracker, getIcon, getStatus, getStatusStyle } from '#components';
import { useEdgeStatus, useStalled } from '#hooks';
import { meta } from '#meta';

export const SyncStatus = () => {
  const client = useClient();
  const state = useSyncState();
  const edgeStatus = useEdgeStatus();
  const [saved, setSaved] = useState(true);
  useEffect(() => createClientSaveTracker(client, (state) => setSaved(state === 'saved')), []);

  return <SyncStatusIndicator state={state} saved={saved} edgeStatus={edgeStatus} />;
};

export const SyncStatusIndicator = ({
  state,
  saved,
  edgeStatus,
}: {
  state: SpaceSyncStateMap;
  saved: boolean;
  edgeStatus: EdgeStatus;
}) => {
  const { t } = useTranslation(meta.profile.key);
  const summary = getSyncSummary(state);
  // Absent peer sync state is indistinguishable from having no connection.
  const offline = edgeStatus.state !== EdgeStatus.ConnectionState.CONNECTED || Object.values(state).length === 0;
  const needsToUpload = summary.differentDocuments > 0 || summary.missingOnRemote > 0;
  const needsToDownload = summary.differentDocuments > 0 || summary.missingOnLocal > 0;

  // Documents left to reconcile; a change means replication advanced, so the stall timer restarts.
  const outstanding = summary.differentDocuments + summary.missingOnLocal + summary.missingOnRemote;
  // Bytes on the wire prove liveness while the document counts hold steady (e.g. one large document).
  const transferring = edgeStatus.rateBytesUp + edgeStatus.rateBytesDown > 0;
  const stalled = useStalled({ active: !offline && outstanding > 0 && !transferring, progress: outstanding });

  const status = getStatus({ offline, saved, stalled, needsToUpload, needsToDownload });
  const icon = getIcon(status);

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <StatusBar.Item>
          <IconButton
            variant='ghost'
            icon={icon}
            iconOnly
            label={t(`${status}.label`)}
            classNames={getStatusStyle(status)}
          />
        </StatusBar.Item>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content side='left'>
          <EdgeConnectionPopover status={edgeStatus} />
          <Popover.Arrow />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
};

const EdgeConnectionPopover = ({ status }: { status: EdgeStatus }) => {
  const { t } = useTranslation(meta.profile.key);
  const client = useClient();

  const isConnected = status.state === EdgeStatus.ConnectionState.CONNECTED;
  const edgeUrl = client.config.get('runtime.services.edge.url');

  return (
    <div className='flex flex-col gap-2 w-[240px] p-2' style={iconSize(4)}>
      {/* Connection Status Header */}
      <div className='flex items-center gap-2 mb-2'>
        <Icon
          icon={isConnected ? 'ph--check-circle--regular' : 'ph--warning-circle--regular'}
          classNames={mx(isConnected ? 'text-success-text' : 'text-error-text animate-pulse')}
        />
        <span className='font-medium text-sm truncate' title={edgeUrl}>
          {isConnected ? (edgeUrl ?? t('sync-edge-connected.label')) : t('sync-edge-disconnected.label')}
        </span>
      </div>

      {/* Connection Details */}
      {!isConnected && (
        <div className='grid grid-cols-[min-content_1fr_min-content_min-content] gap-2'>
          <Icon icon='ph--cloud-x--regular' />
          <span className='text-description'>{t('sync-no-connection.label')}</span>
        </div>
      )}

      {isConnected && (
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

SyncStatus.displayName = 'SyncStatus';
