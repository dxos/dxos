//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import { usePluginManager } from '@dxos/app-framework/ui';
import { Filter, type Database, type Obj, type Ref, Relation } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import { useObject, useQuery } from '@dxos/react-client/echo';
import { DropdownMenu, IconButton, useTranslation } from '@dxos/react-ui';

import { useConnector } from '#hooks';
import { meta } from '#meta';
import { Connection, ConnectorCoordinator, SyncBinding } from '#types';

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
 *
 * When existing {@link Connection} objects for this connector are already in
 * the space the button becomes a dropdown: each existing connection is offered
 * as a reuse option (creates a {@link SyncBinding} inline) and "New
 * Connection" at the bottom starts the usual auth flow.
 */
export const ConnectorAuthButton = ({ connectorId, db, existingTarget }: ConnectorAuthButtonProps) => {
  const { t } = useTranslation(meta.profile.key);
  const manager = usePluginManager();
  const connector = useConnector(connectorId);

  // Subscribe so reuse items enable once the target ref resolves.
  const [existingTargetLoaded] = useObject(existingTarget);

  const allConnections = useQuery(db, Filter.type(Connection.Connection));
  const connections = useMemo(
    () => allConnections.filter((connection) => connection.connectorId === connectorId),
    [allConnections, connectorId],
  );

  const handleCreateNew = useCallback(() => {
    const coordinator = manager.capabilities.get(ConnectorCoordinator);
    void EffectEx.runAndForwardErrors(
      coordinator.createConnection({ db, spaceId: db.spaceId, connectorId, existingTarget }),
    ).catch(() => {});
  }, [manager, db, connectorId, existingTarget]);

  const handleSelectExisting = useCallback(
    (connection: Connection.Connection) => {
      const target = existingTarget?.target;
      if (!target) {
        return;
      }
      db.add(SyncBinding.make({ [Relation.Source]: connection, [Relation.Target]: target }));
    },
    [db, existingTarget],
  );

  if (!connector?.oauth && !connector?.credentialForm) {
    return null;
  }

  const connectorLabel = connector.label ?? connector.id;
  const buttonLabel = t('connect-connection.label', { connector: connectorLabel });

  if (connections.length === 0) {
    return <IconButton onClick={handleCreateNew} icon='ph--plugs--regular' label={buttonLabel} />;
  }

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <IconButton icon='ph--plugs--regular' label={buttonLabel} />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content>
          <DropdownMenu.Viewport>
            {connections.map((connection) => (
              <ConnectionMenuItem
                key={connection.id}
                connection={connection}
                connectorLabel={connectorLabel}
                disabled={!existingTargetLoaded}
                onSelect={handleSelectExisting}
              />
            ))}
            <DropdownMenu.Separator />
            <DropdownMenu.Item onClick={handleCreateNew}>{t('new-connection.label')}</DropdownMenu.Item>
          </DropdownMenu.Viewport>
          <DropdownMenu.Arrow />
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
};

/** One reusable-connection row; resolves the access-token ref reactively for its label. */
const ConnectionMenuItem = ({
  connection,
  connectorLabel,
  disabled,
  onSelect,
}: {
  connection: Connection.Connection;
  connectorLabel: string;
  disabled: boolean;
  onSelect: (connection: Connection.Connection) => void;
}) => {
  const [accessToken] = useObject(connection.accessToken);
  const label =
    connection.name ?? (accessToken?.account ? `${connectorLabel} · ${accessToken.account}` : connectorLabel);

  return (
    <DropdownMenu.Item disabled={disabled} onClick={() => onSelect(connection)}>
      {label}
    </DropdownMenu.Item>
  );
};
