//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect-atom/atom-react';
import * as Schema from 'effect/Schema';
import React, { useCallback, useMemo } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { LayoutOperation, Paths } from '@dxos/app-toolkit';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Filter, Obj } from '@dxos/echo';
import { useObject, useQuery } from '@dxos/echo-react';
import { Cursor } from '@dxos/link';
import { SpaceOperation } from '@dxos/plugin-space';
import { Button, Panel, ScrollArea, useTranslation } from '@dxos/react-ui';
import { Form } from '@dxos/react-ui-form';

import { useConnector } from '#hooks';
import { meta } from '#meta';
import { Connection } from '#types';

import { connectionDeckSubject } from '../../constants';

const EMPTY_SCHEMA = Schema.Struct({});
const EMPTY_VALUES = {};

export type ConnectorCompanionProps = AppSurface.ArticleProps<Cursor.Cursor>;

/**
 * Companion panel focused on the external-sync {@link Cursor} that connects the primary plank's
 * object to its external service. Shows the connection header (name and account) and the sync status
 * for that cursor. The cursor is resolved by the app-graph matcher (external cursors only) and handed
 * in as the companion subject; when an object has multiple cursors (unusual edge case) the matcher
 * picks the first.
 */
export const ConnectorCompanion = ({ subject, role }: ConnectorCompanionProps) => {
  const { t } = useTranslation(meta.profile.key);
  const { invokePromise } = useOperationInvoker();

  // Subscribe so mutable fields (sync status, options) re-render; field reads use the live object.
  useAtomValue(useMemo(() => Obj.atom(subject), [subject]));
  const db = Obj.getDatabase(subject);
  const externalSpec = Cursor.isExternal(subject) ? subject.spec : undefined;

  // The Connection whose access token authenticates this cursor. Cursor no longer relates to
  // Connection directly (that coupling was removed), so it's found by matching access tokens —
  // fuzzy if a token is ever shared across connections.
  const connections = useQuery(db, Filter.type(Connection.Connection));
  const connection = useMemo(
    () => connections.find((candidate) => candidate.accessToken.uri === externalSpec?.source.uri),
    [connections, externalSpec],
  );

  const [connectionObj] = useObject(connection);
  const [accessToken] = useObject(externalSpec?.source);
  const connector = useConnector(connectionObj?.connectorId);

  // Detect whether the cursor's target has been deleted so a cleanup option can be offered.
  const [resolvedTarget] = useObject(externalSpec?.target);
  const targetMissing = !resolvedTarget || Obj.isDeleted(resolvedTarget);

  const handleOpenConnection = useCallback(() => {
    if (!connection || !db) {
      return;
    }
    void invokePromise(LayoutOperation.Open, {
      subject: [connectionDeckSubject(Paths.getSpacePath(db.spaceId), connection.id)],
      navigation: 'immediate',
    });
  }, [invokePromise, connection, db]);

  const handleRemoveBinding = useCallback(() => {
    void invokePromise(SpaceOperation.RemoveObjects, { objects: [subject] });
  }, [invokePromise, subject]);

  // Seed the options form from the cursor's current options.
  const optionsDefaultValues = useMemo(() => ({ ...(externalSpec?.options ?? {}) }), [externalSpec]);
  const handleOptionsChanged = useCallback(
    (values: Record<string, any>) => {
      Obj.update(subject, (subject) => {
        if (subject.spec.kind === 'external') {
          subject.spec.options = { ...values };
        }
      });
    },
    [subject],
  );

  const sourceMissing = !connection;

  const connectorLabel = connector?.label ?? connector?.id ?? connectionObj?.connectorId;
  const account = accessToken?.account;
  const title = connectionObj?.name ?? account ?? connectorLabel ?? '';
  const source = connectorLabel
    ? `${connectorLabel}${account ? ` · ${account}` : ''}`
    : (accessToken?.source ?? undefined);

  const status = sourceMissing
    ? t('binding-source-missing.message')
    : targetMissing
      ? t('binding-target-missing.message')
      : subject.lastTick
        ? `${t('last-sync.label')}: ${new Date(subject.lastTick).toLocaleString()}`
        : t('never-synced.label');

  return (
    <Panel.Root role={role}>
      <Panel.Content asChild>
        <ScrollArea.Root orientation='vertical'>
          <ScrollArea.Viewport>
            <Form.Root variant='settings' schema={EMPTY_SCHEMA} values={EMPTY_VALUES}>
              <Form.Viewport>
                <Form.Content>
                  <Form.Section title={title} description={source}>
                    <Form.Row
                      label={t('sync-target.label')}
                      description={status}
                      validation={
                        !targetMissing && !sourceMissing && subject.lastError ? (
                          <span className='text-sm text-error-text'>{subject.lastError}</span>
                        ) : undefined
                      }
                    >
                      {targetMissing || sourceMissing ? (
                        <Button onClick={handleRemoveBinding}>{t('remove-binding.label')}</Button>
                      ) : undefined}

                      {connector?.optionsSchema && !targetMissing && !sourceMissing && (
                        <Form.Root
                          schema={connector.optionsSchema}
                          defaultValues={optionsDefaultValues}
                          onValuesChanged={handleOptionsChanged}
                        >
                          <Form.Content>
                            <Form.FieldSet />
                          </Form.Content>
                        </Form.Root>
                      )}
                    </Form.Row>

                    {/* TODO(wittjosiah): Ideally this would be in the section header but there's no place to add actions in there currently. */}
                    {!sourceMissing && (
                      <Form.Row label={t('open-connection.label')}>
                        <Button onClick={handleOpenConnection}>{t('open-connection.label')}</Button>
                      </Form.Row>
                    )}
                  </Form.Section>
                </Form.Content>
              </Form.Viewport>
            </Form.Root>
          </ScrollArea.Viewport>
        </ScrollArea.Root>
      </Panel.Content>
    </Panel.Root>
  );
};

ConnectorCompanion.displayName = 'ConnectorCompanion';
