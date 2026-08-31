//
// Copyright 2024 DXOS.org
//

import React, { useEffect, useState } from 'react';

import { StatusBar } from '@dxos/plugin-status-bar/components';
import { EdgeStatus } from '@dxos/protocols/proto/dxos/client/services';
import { useClient } from '@dxos/react-client';
import { type SpaceSyncStateMap, getSyncSummary, useSyncState } from '@dxos/react-client/echo';
import { Flex, Grid, Icon, IconButton, Popover, useTranslation } from '@dxos/react-ui';
import { iconSize, mx } from '@dxos/ui-theme';
import { Unit, type UnitFormat } from '@dxos/util';

import { createClientSaveTracker, getIcon, getStatus } from '#components';
import { useEdgeStatus, useStalled } from '#hooks';
import { meta } from '#meta';

const SYNC_COLS = ['min-content', '1fr', 'min-content', 'min-content'];

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
          {/* The icon and label carry the status; the indicator keeps a single colour in every state. */}
          <IconButton variant='ghost' icon={icon} iconOnly label={t(`${status}.label`)} />
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
    <Flex column gap='sm' classNames='w-[240px] p-2' style={iconSize(4)}>
      {/* Connection Status Header */}
      <Flex gap='sm' align='center' classNames='mb-2'>
        <Icon
          icon={isConnected ? 'ph--check-circle--regular' : 'ph--warning-circle--regular'}
          classNames={mx(isConnected ? 'text-success-text' : 'text-error-text animate-pulse')}
        />
        <span className='font-medium text-sm truncate' title={edgeUrl}>
          {isConnected ? (edgeUrl ?? t('sync-edge-connected.label')) : t('sync-edge-disconnected.label')}
        </span>
      </Flex>

      {/* Connection Details */}
      {!isConnected && (
        <Grid cols={SYNC_COLS} grow={false} gap='sm'>
          <Icon icon='ph--cloud-x--regular' />
          <span className='text-description'>{t('sync-no-connection.label')}</span>
        </Grid>
      )}

      {isConnected && (
        <Grid cols={SYNC_COLS} grow={false} gap='sm' classNames='gap-y-1'>
          {/* Latency */}
          <Grid cols='subgrid' grow={false} gap='sm' align='center' classNames='text-sm'>
            <Icon icon='ph--timer--regular' />
            <span className='text-description'>{t('sync-latency.label')}</span>
            <div />
            <UnitValue value={status.rtt} format={Unit.Millisecond} />
          </Grid>

          {/* Upload Speed */}
          <Grid cols='subgrid' grow={false} gap='sm' align='center' classNames='text-sm'>
            <Icon icon='ph--arrow-up--regular' classNames='text-green-500' />
            <span className='text-description'>{t('sync-upload.label')}</span>
            <UnitValue value={status.messagesSent} format={Unit.Thousand} />
            <UnitValue value={status.rateBytesUp} format={Unit.Kilobyte} suffix='/s' />
          </Grid>

          {/* Download Speed */}
          <Grid cols='subgrid' grow={false} gap='sm' align='center' classNames='text-sm'>
            <Icon icon='ph--arrow-down--regular' classNames='text-orange-500' />
            <span className='text-description'>{t('sync-download.label')}</span>
            <UnitValue value={status.messagesReceived} format={Unit.Thousand} />
            <UnitValue value={status.rateBytesDown} format={Unit.Kilobyte} suffix='/s' />
          </Grid>
        </Grid>
      )}
    </Flex>
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
