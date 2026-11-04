//
// Copyright 2024 DXOS.org
//

import React from 'react';

import * as AppHooks from '@dxos/app-framework/Hooks';
import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import { EdgeStatus_ConnectionState } from '@dxos/protocols/buf/dxos/client/services_pb';
import { EdgeReplicationSetting } from '@dxos/protocols/buf/dxos/echo/metadata_pb';
import { type Space, useSpaceSyncState } from '@dxos/react-client/echo';
import { AttentionGlyph, useAttention } from '@dxos/react-ui-attention';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Tooltip from '@dxos/react-ui/Tooltip';

import { useEdgeStatus } from '#hooks';
import { SpaceCapabilities } from '#types';

import { SpaceNamespace } from '../../namespace.ts';
import { getPresenceKeyFromSpace } from '../../util/index.ts';
import { useActiveViewerCount } from '../SpacePresence/index.ts';

export const InlineSyncStatus = ({ space, open }: { space: Space; open?: boolean }) => {
  const { t } = Hooks.useTranslation(SpaceNamespace.key);
  const qualifiedId = GraphPath.getSpacePath(space.id);
  const { hasAttention, isAncestor, isRelated } = useAttention(qualifiedId);
  const attended = hasAttention || isRelated;
  const containsAttended = isAncestor && !open;
  const connectedToEdge = useEdgeStatus().state === EdgeStatus_ConnectionState.CONNECTED;
  // TODO(wittjosiah): This is not reactive.
  const edgeSyncEnabled = space.internal.data.edgeReplication === EdgeReplicationSetting.ENABLED;
  const syncState = useSpaceSyncState(space);
  const syncing = connectedToEdge && edgeSyncEnabled && syncState && syncState.missingOnLocal > 0;
  const ephemeral = AppHooks.useAtomCapability(SpaceCapabilities.EphemeralState);
  const count = useActiveViewerCount(ephemeral.viewersByObject[getPresenceKeyFromSpace(space.id)]);
  // The spinner takes the presence mark's place while syncing, so the tooltip still carries the count.
  const label =
    syncing && count > 0
      ? `${t('syncing.label')} · ${t('presence.label', { count })}`
      : syncing
        ? t('syncing.label')
        : t('presence.label', { count });

  return (
    <Tooltip.Trigger asChild content={label} side='bottom'>
      <AttentionGlyph
        syncing={syncing}
        presence={count > 1 ? 'many' : count === 1 ? 'one' : 'none'}
        attended={attended}
        containsAttended={containsAttended}
        classNames='self-center mx-1'
      />
    </Tooltip.Trigger>
  );
};

InlineSyncStatus.displayName = 'InlineSyncStatus';
