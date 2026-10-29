//
// Copyright 2024 DXOS.org
//

import React, { useEffect, useRef, useState } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as StatusBar from '@dxos/plugin-status-bar/StatusBar';
import { type EdgeStatus, EdgeStatus_ConnectionState } from '@dxos/protocols/buf/dxos/client/services_pb';
import { useClient } from '@dxos/react-client';
import { type SpaceSyncStateMap, getSyncSummary, useSyncState } from '@dxos/react-client/echo';
import * as Button from '@dxos/react-ui/Button';
import * as UiHooks from '@dxos/react-ui/Hooks';
import * as Icon from '@dxos/react-ui/Icon';
import * as Layout from '@dxos/react-ui/Layout';
import * as Popover from '@dxos/react-ui/Popover';
import { iconSize, mx } from '@dxos/ui-theme';
import { Unit, type UnitFormat } from '@dxos/util';

import { type SaveState, createClientSaveTracker, getIcon, getStatus } from '#components';
import { useEdgeStatus, useStalled } from '#hooks';

import { SpaceNamespace } from '../../namespace.ts';

const SYNC_COLS = ['min', 'fill', 'min', 'min'] as const;

export const SyncStatus = () => {
  const client = useClient();
  const state = useSyncState();
  const edgeStatus = useEdgeStatus();
  const [save, setSave] = useState<SaveState>('saved');
  useEffect(() => createClientSaveTracker(client, setSave), []);
  useSaveFailureToast(save);

  return <SyncStatusIndicator state={state} save={save} edgeStatus={edgeStatus} />;
};

const SAVE_FAILURE_TOAST_ID = `${SpaceNamespace.key}/save-failing`;

/**
 * A failed save leaves changes only in this page, where a reload loses them, so the warning stays up
 * until saving resumes and is then replaced (same id) by a short confirmation.
 */
const useSaveFailureToast = (save: SaveState) => {
  const { invokePromise } = Hooks.useOperationInvoker();
  const raised = useRef(false);
  useEffect(() => {
    if (save === 'failing' && !raised.current) {
      raised.current = true;
      void invokePromise(LayoutOperation.AddToast, {
        id: SAVE_FAILURE_TOAST_ID,
        icon: 'ph--warning--regular',
        title: ['persistence-error.label', { ns: SpaceNamespace.key }],
        description: ['persistence-error.message', { ns: SpaceNamespace.key }],
        duration: Infinity,
      });
    } else if (save === 'saved' && raised.current) {
      raised.current = false;
      void invokePromise(LayoutOperation.AddToast, {
        id: SAVE_FAILURE_TOAST_ID,
        icon: 'ph--check-circle--regular',
        title: ['persistence-recovered.label', { ns: SpaceNamespace.key }],
        duration: 4_000,
      });
    }
  }, [save, invokePromise]);
};

export const SyncStatusIndicator = ({
  state,
  save,
  edgeStatus,
}: {
  state: SpaceSyncStateMap;
  save: SaveState;
  edgeStatus: EdgeStatus;
}) => {
  const { t } = UiHooks.useTranslation(SpaceNamespace.key);
  const summary = getSyncSummary(state);
  // Absent peer sync state is indistinguishable from having no connection.
  const offline = edgeStatus.state !== EdgeStatus_ConnectionState.CONNECTED || Object.values(state).length === 0;
  const needsToUpload = summary.differentDocuments > 0 || summary.missingOnRemote > 0;
  const needsToDownload = summary.differentDocuments > 0 || summary.missingOnLocal > 0;

  // Documents left to reconcile; a change means replication advanced, so the stall timer restarts.
  const outstanding = summary.differentDocuments + summary.missingOnLocal + summary.missingOnRemote;
  // Bytes on the wire prove liveness while the document counts hold steady (e.g. one large document).
  const transferring = edgeStatus.rateBytesUp + edgeStatus.rateBytesDown > 0;
  const stalled = useStalled({ active: !offline && outstanding > 0 && !transferring, progress: outstanding });

  const status = getStatus({ offline, save, stalled, needsToUpload, needsToDownload });
  const icon = getIcon(status);

  return (
    <Popover.Root positioning={{ placement: 'left' }}>
      <Popover.Trigger asChild>
        <StatusBar.Item data-testid='spacePlugin.syncStatus' data-saved={save === 'saved'}>
          {/* The icon and label carry the status; the indicator keeps a single colour in every state. */}
          <Button.Root variant='ghost' icon={icon} iconOnly label={t(`${status}.label`)} />
        </StatusBar.Item>
      </Popover.Trigger>
      <Popover.Content>
        <EdgeConnectionPopover status={edgeStatus} />
      </Popover.Content>
    </Popover.Root>
  );
};

const EdgeConnectionPopover = ({ status }: { status: EdgeStatus }) => {
  const { t } = UiHooks.useTranslation(SpaceNamespace.key);
  const client = useClient();

  const isConnected = status.state === EdgeStatus_ConnectionState.CONNECTED;
  const edgeUrl = client.config.get('runtime.services.edge.url');

  return (
    <Layout.Flex column gap='sm' classNames='w-popover-min-width p-2' style={iconSize(4)}>
      {/* Connection Status Header */}
      <Layout.Flex gap='sm' align='center' classNames='mb-2'>
        <Icon.Icon
          icon={isConnected ? 'ph--check-circle--regular' : 'ph--warning-circle--regular'}
          classNames={mx(isConnected ? 'text-success-text' : 'text-error-text animate-pulse')}
        />
        <span className='font-medium text-sm truncate' title={edgeUrl}>
          {isConnected ? (edgeUrl ?? t('sync-edge-connected.label')) : t('sync-edge-disconnected.label')}
        </span>
      </Layout.Flex>

      {/* Connection Details */}
      {!isConnected && (
        <Layout.Grid cols={SYNC_COLS} gap='sm'>
          <Icon.Icon icon='ph--cloud-x--regular' />
          <span className='text-fg-muted'>{t('sync-no-connection.label')}</span>
        </Layout.Grid>
      )}

      {isConnected && (
        <Layout.Grid cols={SYNC_COLS} gap='sm' classNames='gap-y-1'>
          {/* Latency */}
          <Layout.Grid cols='subgrid' gap='sm' align='center' classNames='text-sm'>
            <Icon.Icon icon='ph--timer--regular' />
            <span className='text-fg-muted'>{t('sync-latency.label')}</span>
            <div />
            <UnitValue value={status.rtt} format={Unit.Millisecond} />
          </Layout.Grid>

          {/* Upload Speed */}
          <Layout.Grid cols='subgrid' gap='sm' align='center' classNames='text-sm'>
            <Icon.Icon icon='ph--arrow-up--regular' classNames='text-green-text' />
            <span className='text-fg-muted'>{t('sync-upload.label')}</span>
            <UnitValue value={status.messagesSent} format={Unit.Thousand} />
            <UnitValue value={status.rateBytesUp} format={Unit.Kilobyte} suffix='/s' />
          </Layout.Grid>

          {/* Download Speed */}
          <Layout.Grid cols='subgrid' gap='sm' align='center' classNames='text-sm'>
            <Icon.Icon icon='ph--arrow-down--regular' classNames='text-orange-text' />
            <span className='text-fg-muted'>{t('sync-download.label')}</span>
            <UnitValue value={status.messagesReceived} format={Unit.Thousand} />
            <UnitValue value={status.rateBytesDown} format={Unit.Kilobyte} suffix='/s' />
          </Layout.Grid>
        </Layout.Grid>
      )}
    </Layout.Flex>
  );
};

// TODO(burdon): Factor out.
const UnitValue = ({ value: input, format, suffix }: { value: number; format: UnitFormat; suffix?: string }) => {
  const { formattedValue, unit } = format(input);
  return (
    <span className='font-mono'>
      {formattedValue}
      <span className='ms-1 text-fg-subtle'>
        {unit.symbol}
        {suffix}
      </span>
    </span>
  );
};

SyncStatus.displayName = 'SyncStatus';
