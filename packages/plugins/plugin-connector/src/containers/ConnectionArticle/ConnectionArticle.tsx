//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Filter, Obj } from '@dxos/echo';
import { Cursor } from '@dxos/link';
import { SpaceOperation } from '@dxos/plugin-space';
import { useObject, useQuery } from '@dxos/react-client/echo';

import { ConnectionView } from '#components';
import { useConnector, useReauthenticate, useSyncConnection, useSyncTargetsChecklist, useTestConnection } from '#hooks';

import { type Connection } from '../../types';
import { isCursorForConnection } from '../../util';

export type ConnectionArticleProps = AppSurface.ObjectArticleProps<Connection.Connection>;

/**
 * Container for the {@link Connection} article surface. Resolves the connection's
 * connector capability, sync state, and cursors, then hands resolved values and
 * handlers to the presentational {@link ConnectionView} (the capability hooks live
 * here so the view stays storybook-mountable).
 */
export const ConnectionArticle = ({ subject, role }: ConnectionArticleProps) => {
  // Snapshot drives reactive display; the live `subject` is handed to hooks that need an entity.
  const [connection] = useObject(subject);
  const [accessToken] = useObject(subject.accessToken);
  const connector = useConnector(connection?.connectorId);
  const db = Obj.getDatabase(subject);
  const allCursors = useQuery(db, Filter.type(Cursor.Cursor));
  const bindings = useMemo(
    () => allCursors.filter((cursor): cursor is Cursor.ExternalCursor => isCursorForConnection(cursor, subject)),
    [allCursors, subject],
  );
  const { invokePromise } = useOperationInvoker();

  const { available: syncTargetsAvailable, loading, openChecklist } = useSyncTargetsChecklist(subject);
  const { available: syncAvailable, syncing, sync } = useSyncConnection(subject);
  const { status: testStatus, error: testError, retest } = useTestConnection(subject);
  const { available: canReauthenticate, reauthenticating, reauthenticate } = useReauthenticate(subject);

  const handleDelete = useCallback(() => {
    void invokePromise(SpaceOperation.RemoveObjects, { objects: [subject] });
  }, [invokePromise, subject]);

  const handleRemoveBinding = useCallback(
    (binding: Cursor.ExternalCursor) => {
      void invokePromise(SpaceOperation.RemoveObjects, { objects: [binding] });
    },
    [invokePromise],
  );

  const connectorLabel = connector?.label ?? connector?.id ?? connection?.connectorId;
  const account = accessToken?.account;
  const title = connection?.name ?? account ?? connectorLabel ?? '';
  const source = connectorLabel
    ? `${connectorLabel}${account ? ` · ${account}` : ''}`
    : (accessToken?.source ?? undefined);

  return (
    <ConnectionView
      role={role}
      title={title}
      source={source}
      hasConnector={!!connector}
      bindings={bindings}
      optionsSchema={connector?.optionsSchema}
      canSync={!!connector?.sync && syncAvailable}
      canChangeTargets={!!connector?.getSyncTargets}
      syncing={syncing}
      loadingTargets={loading}
      syncTargetsAvailable={syncTargetsAvailable}
      testStatus={testStatus}
      testError={testError}
      canReauthenticate={canReauthenticate}
      reauthenticating={reauthenticating}
      onSync={() => void sync()}
      onChangeTargets={openChecklist}
      onReauthenticate={reauthenticate}
      onTestConnection={retest}
      onDelete={handleDelete}
      onRemoveBinding={handleRemoveBinding}
    />
  );
};

ConnectionArticle.displayName = 'ConnectionArticle';
