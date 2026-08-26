//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Filter, Obj } from '@dxos/echo';
import { useObject, useQuery } from '@dxos/echo-react';
import { Connection, Cursor } from '@dxos/link';
import * as SpaceOperation from '@dxos/plugin-space/SpaceOperation';

import { ConnectionView } from '#components';
import { useConnector, useReauthenticate, useSyncConnection, useSyncTargetsChecklist, useTestConnection } from '#hooks';

import * as Binding from '../../Binding';
import { connectionsDeckSubject } from '../../constants';

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
    () => allCursors.filter((cursor): cursor is Cursor.ExternalCursor => Binding.isForConnection(cursor, subject)),
    [allCursors, subject],
  );
  const { invokePromise } = useOperationInvoker();

  const { available: syncTargetsAvailable, loading, openChecklist } = useSyncTargetsChecklist(subject);
  const { available: syncAvailable, syncing, sync } = useSyncConnection(subject);
  const { status: testStatus, error: testError, testing, retest } = useTestConnection(subject);
  const { available: canReauthenticate, reauthenticating, reauthenticate } = useReauthenticate(subject);

  const handleDelete = useCallback(() => {
    // Only the connection: its cursors are left dormant, holding the sync progress a later re-connect of
    // the same account resumes from.
    const spaceId = db?.spaceId;
    void invokePromise(SpaceOperation.RemoveObjects, { objects: [subject] }).then(
      () =>
        // Fall back to the Connections section: this article's own subject stops resolving the
        // moment the connection is gone, which would otherwise leave the deck on a dead node.
        spaceId &&
        invokePromise(LayoutOperation.Open, {
          subject: [connectionsDeckSubject(GraphPath.getSpacePath(spaceId))],
          navigation: 'immediate',
        }),
    );
  }, [invokePromise, subject, db]);

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
      optionsSchema={connector?.sync?.optionsSchema}
      canSync={!!connector?.sync && syncAvailable}
      canChangeTargets={!!connector?.sync?.getTargets}
      syncing={syncing}
      loadingTargets={loading}
      syncTargetsAvailable={syncTargetsAvailable}
      testStatus={testStatus}
      testError={testError}
      testing={testing}
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
