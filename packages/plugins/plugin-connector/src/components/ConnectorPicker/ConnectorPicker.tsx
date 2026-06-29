//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import { type Database, type Obj, type Ref, Filter, Relation } from '@dxos/echo';
import { useObject, useQuery } from '@dxos/react-client/echo';
import { useTranslation } from '@dxos/react-ui';
import { Listbox } from '@dxos/react-ui-list';

import { useConnector } from '#hooks';
import { meta } from '#meta';

import { Connection, SyncBinding } from '../../types';
import { ConnectorAuthButton } from '../ConnectorAuthButton';

export type ConnectorPickerProps = {
  /** Stable id of the {@link Connector} capability entry to authenticate against. */
  connectorId: string;
  db: Database.Database;
  /**
   * Existing local object to bind to a chosen connection (e.g. an empty
   * Mailbox the user is viewing). Selecting an existing connection creates a
   * {@link SyncBinding} from that connection to this target.
   */
  existingTarget?: Ref.Ref<Obj.Unknown>;
};

/**
 * Lets the user reuse an existing {@link Connection} for a given connector — or
 * start a new auth flow. Reuse binds the picked connection to `existingTarget`
 * by creating a {@link SyncBinding} inline; "New connection…" defers to
 * {@link ConnectorAuthButton}.
 */
export const ConnectorPicker = ({ connectorId, db, existingTarget }: ConnectorPickerProps) => {
  const { t } = useTranslation(meta.profile.key);
  const connector = useConnector(connectorId);
  // Subscribe so the picker re-renders once the target ref resolves; the relation
  // itself needs the live entity (not the snapshot), read from the ref in the handler.
  const [existingTargetLoaded] = useObject(existingTarget);
  const allConnections = useQuery(db, Filter.type(Connection.Connection));
  const connectorIds = useMemo(() => [connectorId], [connectorId]);
  const connections = useMemo(
    () => allConnections.filter((connection) => connection.connectorId === connectorId),
    [allConnections, connectorId],
  );

  const handleSelect = useCallback(
    (connection: Connection.Connection) => {
      const target = existingTarget?.target;
      if (!target) {
        return;
      }
      db.add(
        SyncBinding.make({
          [Relation.Source]: connection,
          [Relation.Target]: target,
        }),
      );
    },
    [db, existingTarget],
  );

  const connectorLabel = connector?.label ?? connector?.id ?? connectorId;
  // Reuse is only possible once the target ref has resolved to a live entity.
  const canReuse = !!existingTargetLoaded;

  return (
    <div className='flex flex-col gap-2'>
      {connections.length > 0 && (
        <Listbox.Root>
          <Listbox.Viewport>
            <Listbox.Content aria-label={t('connections.label')}>
              {connections.map((connection) => (
                <ConnectionItem
                  key={connection.id}
                  connection={connection}
                  connectorLabel={connectorLabel}
                  disabled={!canReuse}
                  onSelect={handleSelect}
                />
              ))}
            </Listbox.Content>
          </Listbox.Viewport>
        </Listbox.Root>
      )}
      <ConnectorAuthButton connectorIds={connectorIds} db={db} existingTarget={existingTarget} />
    </div>
  );
};

/** One reusable-connection row; resolves the access-token ref reactively for its label. */
const ConnectionItem = ({
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
    <Listbox.Item
      id={connection.id}
      classNames={disabled ? 'opacity-50' : 'cursor-pointer'}
      onClick={() => !disabled && onSelect(connection)}
    >
      <span className='truncate'>{label}</span>
    </Listbox.Item>
  );
};
