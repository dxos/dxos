//
// Copyright 2026 DXOS.org
//

import React, { useCallback } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Filter, Obj, Query } from '@dxos/echo';
import { SpaceOperation } from '@dxos/plugin-space';
import { useObject, useQuery } from '@dxos/react-client/echo';
import { type Connection, SyncBinding } from '@dxos/types';

import { ConnectionView } from '#components';
import { useConnector, useSyncConnection, useSyncTargetsChecklist } from '#hooks';

export type ConnectionArticleProps = AppSurface.ObjectArticleProps<Connection.Connection>;

/**
 * Container for the {@link Connection} article surface. Resolves the connection's
 * connector capability, sync state, and bindings, then hands resolved values and
 * handlers to the presentational {@link ConnectionView} (the capability hooks live
 * here so the view stays storybook-mountable).
 */
export const ConnectionArticle = ({ subject, role }: ConnectionArticleProps) => {
  // Snapshot drives reactive display; the live `subject` is handed to hooks that need an entity.
  const [connection] = useObject(subject);
  const [accessToken] = useObject(subject.accessToken);
  const connector = useConnector(connection?.connectorId);
  const db = Obj.getDatabase(subject);
  const bindings = useQuery(db, Query.select(Filter.id(subject.id)).sourceOf(SyncBinding.SyncBinding));
  const { invokePromise } = useOperationInvoker();

  const { available: syncTargetsAvailable, loading, openChecklist } = useSyncTargetsChecklist(subject);
  const { available: syncAvailable, syncing, sync } = useSyncConnection(subject);

  const handleDelete = useCallback(() => {
    void invokePromise(SpaceOperation.RemoveObjects, { objects: [subject] });
  }, [invokePromise, subject]);

  const handleRemoveBinding = useCallback(
    (binding: SyncBinding.SyncBinding) => {
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
      onSync={() => void sync()}
      onChangeTargets={openChecklist}
      onDelete={handleDelete}
      onRemoveBinding={handleRemoveBinding}
    />
  );
};

ConnectionArticle.displayName = 'ConnectionArticle';
