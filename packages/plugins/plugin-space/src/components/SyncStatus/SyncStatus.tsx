//
// Copyright 2024 DXOS.org
//

import React, { useEffect, useState } from 'react';

import { StatusBar } from '@dxos/plugin-status-bar';
import { useClient } from '@dxos/react-client';
import { type SpaceSyncStateMap, getSyncSummary, useSyncState } from '@dxos/react-client/echo';
import { Icon, useTranslation } from '@dxos/react-ui';

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
  const icon = <Icon icon={getIcon(status)} size={4} classNames={classNames} />;

  return <StatusBar.Item title={title}>{icon}</StatusBar.Item>;
};
