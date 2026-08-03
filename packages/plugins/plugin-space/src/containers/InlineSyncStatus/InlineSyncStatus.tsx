//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { GraphPath } from '@dxos/app-toolkit';
import { EdgeStatus } from '@dxos/protocols/proto/dxos/client/services';
import { EdgeReplicationSetting } from '@dxos/protocols/proto/dxos/echo/metadata';
import { type Space, useSpaceSyncState } from '@dxos/react-client/echo';
import { Tooltip, useTranslation } from '@dxos/react-ui';
import { AttentionGlyph, useAttention } from '@dxos/react-ui-attention';

import { useEdgeStatus } from '#hooks';
import { meta } from '#meta';

export const InlineSyncStatus = ({ space, open }: { space: Space; open?: boolean }) => {
  const { t } = useTranslation(meta.profile.key);
  const qualifiedId = GraphPath.getSpacePath(space.id);
  const { hasAttention, isAncestor, isRelated } = useAttention(qualifiedId);
  const attended = hasAttention || isRelated;
  const containsAttended = isAncestor && !open;
  const connectedToEdge = useEdgeStatus().state === EdgeStatus.ConnectionState.CONNECTED;
  // TODO(wittjosiah): This is not reactive.
  const edgeSyncEnabled = space.internal.data.edgeReplication === EdgeReplicationSetting.ENABLED;
  const syncState = useSpaceSyncState(space);
  const syncing = connectedToEdge && edgeSyncEnabled && syncState && syncState.missingOnLocal > 0;

  return (
    <Tooltip.Trigger asChild content={t('syncing.label')} side='bottom'>
      <AttentionGlyph
        syncing={syncing}
        attended={attended}
        containsAttended={containsAttended}
        classNames='self-center mx-1'
      />
    </Tooltip.Trigger>
  );
};

InlineSyncStatus.displayName = 'InlineSyncStatus';
