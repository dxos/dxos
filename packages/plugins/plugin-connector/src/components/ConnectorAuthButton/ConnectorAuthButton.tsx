//
// Copyright 2025 DXOS.org
//

import React, { useCallback } from 'react';

import { usePluginManager } from '@dxos/app-framework/ui';
import { type Database, type Obj, type Ref } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import { IconButton, useTranslation } from '@dxos/react-ui';

import { useConnector } from '#hooks';
import { meta } from '#meta';
import { ConnectorCoordinator } from '#types';

export type ConnectorAuthButtonProps = {
  /** Stable id of the {@link Connector} capability entry to authenticate against. */
  connectorId: string;
  db: Database.Database;
  /**
   * Existing local object (e.g. an empty Mailbox or Calendar the user is
   * already viewing) to wire up as the new connection's first sync target —
   * skips creating a fresh placeholder. Threaded through to the connector's
   * `onTokenCreated` and the sync-targets dialog.
   */
  existingTarget?: Ref.Ref<Obj.Unknown>;
};

/**
 * Inline connect button. Hands off to the long-lived
 * {@link ConnectorCoordinator}, which builds the AccessToken + Connection
 * stubs in memory, runs the connector's auth flow (OAuth or credential form),
 * and persists everything on success — same flow as the standard
 * "Add Object → Connection" dialog. Used by callers (e.g. inbox / calendar)
 * that detect a missing connection mid-flow. Renders only when the connector
 * has an `oauth` or `credentialForm` flow.
 */
export const ConnectorAuthButton = ({ connectorId, db, existingTarget }: ConnectorAuthButtonProps) => {
  const { t } = useTranslation(meta.profile.key);
  const manager = usePluginManager();
  const connector = useConnector(connectorId);

  const handleClick = useCallback(() => {
    const coordinator = manager.capabilities.get(ConnectorCoordinator);
    void EffectEx.runAndForwardErrors(
      coordinator.createConnection({ db, spaceId: db.spaceId, connectorId, existingTarget }),
    ).catch(() => {});
  }, [manager, db, connectorId, existingTarget]);

  if (!connector?.oauth && !connector?.credentialForm) {
    return null;
  }

  return (
    <IconButton
      onClick={handleClick}
      icon='ph--plugs--regular'
      label={t('connect-connection.label', {
        connector: connector.label ?? connector.id,
      })}
    />
  );
};
