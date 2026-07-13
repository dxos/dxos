//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import { useCapabilities, usePluginManager } from '@dxos/app-framework/ui';
import { type Database, Filter, type Obj, type Ref, Relation } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import { useObject, useQuery } from '@dxos/react-client/echo';
import { DropdownMenu, IconButton, useTranslation } from '@dxos/react-ui';

import { meta } from '#meta';
import { Connection, Connector, ConnectorCoordinator, type ConnectorEntry, SyncBinding } from '#types';

export type ConnectorAuthButtonProps = {
  /**
   * Stable ids of the {@link Connector} entries this button operates over: existing connections from
   * any of them are offered for reuse, and each (with an auth flow) gets a "Connect X" entry for
   * creating a new connection. A single-element list behaves like the old single-connector button.
   */
  connectorIds: readonly string[];
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
 * Inline connect dropdown. Always a dropdown menu: existing {@link Connection} objects for any of the
 * given connectors are listed first (each creates a {@link SyncBinding} inline when selected), then —
 * after a divider — a "Connect X" entry per connector starts the usual auth flow via the long-lived
 * {@link ConnectorCoordinator} (which builds the AccessToken + Connection stubs, runs OAuth or the
 * credential form, and persists on success). Used by callers (inbox / calendar) that detect a missing
 * connection mid-flow.
 */
export const ConnectorAuthButton = ({ connectorIds, db, existingTarget }: ConnectorAuthButtonProps) => {
  const { t } = useTranslation(meta.profile.key);
  const manager = usePluginManager();
  const allConnectors = useCapabilities(Connector).flat();

  // Connectors offered for a NEW connection: those in the list that actually expose an auth flow.
  const offered = useMemo(
    () =>
      connectorIds
        .map((id) => allConnectors.find((connector) => connector.id === id))
        .filter(
          (connector): connector is ConnectorEntry => !!connector && (!!connector.oauth || !!connector.credentialForm),
        ),
    [connectorIds, allConnectors],
  );

  // Subscribe so reuse items enable once the target ref resolves.
  const [existingTargetLoaded] = useObject(existingTarget);

  const allConnections = useQuery(db, Filter.type(Connection.Connection));
  const connections = useMemo(
    () =>
      allConnections.filter(
        (connection) => connection.connectorId !== undefined && connectorIds.includes(connection.connectorId),
      ),
    [allConnections, connectorIds],
  );

  const handleCreateNew = useCallback(
    (connectorId: string) => {
      const coordinator = manager.capabilities.get(ConnectorCoordinator);
      void EffectEx.runAndForwardErrors(
        coordinator.createConnection({ db, spaceId: db.spaceId, connectorId, existingTarget }),
      ).catch(() => {});
    },
    [manager, db, existingTarget],
  );

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

  const connectorLabel = useCallback(
    (connectorId: string | undefined): string =>
      allConnectors.find((connector) => connector.id === connectorId)?.label ?? connectorId ?? t('connect.label'),
    [allConnectors, t],
  );

  // Nothing to reuse and no connector with an auth flow.
  if (offered.length === 0 && connections.length === 0) {
    return null;
  }

  // A single connector with nothing to reuse needs no menu — a plain connect button suffices.
  if (offered.length === 1 && connections.length === 0) {
    const [connector] = offered;
    if (connector) {
      return (
        <IconButton
          icon='ph--plugs--regular'
          label={t('connect-connection.label', { connector: connector.label ?? connector.id })}
          data-testid={`connector.connect.${connector.id}`}
          onClick={() => handleCreateNew(connector.id)}
        />
      );
    }
  }

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <IconButton icon='ph--plugs--regular' label={t('connect.label')} data-testid='connector.connect' />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content>
          <DropdownMenu.Viewport>
            {connections.map((connection) => (
              <ConnectionMenuItem
                key={connection.id}
                connection={connection}
                connectorLabel={connectorLabel(connection.connectorId)}
                disabled={!existingTargetLoaded}
                onSelect={handleSelectExisting}
              />
            ))}
            {connections.length > 0 && offered.length > 0 && <DropdownMenu.Separator />}
            {offered.map((connector) => (
              <DropdownMenu.Item
                key={connector.id}
                data-testid={`connector.connect.${connector.id}`}
                onClick={() => handleCreateNew(connector.id)}
              >
                {t('connect-connection.label', { connector: connector.label ?? connector.id })}
              </DropdownMenu.Item>
            ))}
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
  // Lead with "<connector> · <account>" so multiple connections of the same connector are
  // distinguishable; fall back to the connection name / connector label when no account is set.
  const label = accessToken?.account
    ? `${connectorLabel} · ${accessToken.account}`
    : (connection.name ?? connectorLabel);

  return (
    <DropdownMenu.Item disabled={disabled} onClick={() => onSelect(connection)}>
      {label}
    </DropdownMenu.Item>
  );
};
