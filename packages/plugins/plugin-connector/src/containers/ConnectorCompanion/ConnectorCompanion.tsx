//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect-atom/atom-react';
import * as Schema from 'effect/Schema';
import React, { useCallback, useMemo } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { LayoutOperation, Paths } from '@dxos/app-toolkit';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Obj, Relation } from '@dxos/echo';
import { SpaceOperation } from '@dxos/plugin-space';
import { useObject } from '@dxos/react-client/echo';
import { Button, Panel, ScrollArea, useTranslation } from '@dxos/react-ui';
import { Form } from '@dxos/react-ui-form';

import { useConnector } from '#hooks';
import { meta } from '#meta';
import { Connection, SyncBinding } from '#types';

import { connectionDeckSubject } from '../../constants';

const EMPTY_SCHEMA = Schema.Struct({});
const EMPTY_VALUES = {};

export type ConnectorCompanionProps = AppSurface.ArticleProps<SyncBinding.SyncBinding>;

/**
 * Companion panel focused on the {@link SyncBinding} that connects the primary
 * plank's object to its external service. Shows the connection header (name and
 * account) and the sync status for that binding. The binding is resolved by the
 * app-graph matcher and handed in as the companion subject; when an object has
 * multiple bindings (unusual edge case) the matcher picks the first.
 */
export const ConnectorCompanion = ({ subject, role }: ConnectorCompanionProps) => {
  const { t } = useTranslation(meta.profile.key);
  const { invokePromise } = useOperationInvoker();

  // The subject is an ECHO relation. Subscribe to it so its mutable fields
  // (sync status, options) re-render; field reads use the live relation.
  useAtomValue(useMemo(() => Relation.atom(subject), [subject]));
  const db = Obj.getDatabase(subject);

  // Source connection of the binding.
  const connection = useMemo(() => {
    try {
      const source = Relation.getSource(subject);
      return Connection.instanceOf(source) ? source : undefined;
    } catch {
      return undefined;
    }
  }, [subject]);

  const [connectionObj] = useObject(connection);
  const [accessToken] = useObject(connection?.accessToken);
  const connector = useConnector(connectionObj?.connectorId);

  // Detect whether the binding's target has been deleted so a cleanup option can be offered.
  const target = useMemo(() => {
    try {
      return Relation.getTarget(subject);
    } catch {
      return undefined;
    }
  }, [subject]);
  const [resolvedTarget] = useObject(target);
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

  // Seed the options form from the binding's current options; changes persist via Relation.update.
  const optionsDefaultValues = useMemo(() => ({ ...(subject.options ?? {}) }), [subject.options]);
  const handleOptionsChanged = useCallback(
    (values: Record<string, any>) => {
      Relation.update(subject, (binding) => {
        binding.options = { ...values };
      });
    },
    [subject],
  );

  if (!connection) {
    return null;
  }

  const connectorLabel = connector?.label ?? connector?.id ?? connectionObj?.connectorId;
  const account = accessToken?.account;
  const title = connectionObj?.name ?? account ?? connectorLabel ?? '';
  const source = connectorLabel
    ? `${connectorLabel}${account ? ` · ${account}` : ''}`
    : (accessToken?.source ?? undefined);

  const status = targetMissing
    ? t('binding-target-missing.message')
    : subject.lastSyncAt
      ? `${t('last-sync.label')}: ${new Date(subject.lastSyncAt).toLocaleString()}`
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
                        !targetMissing && subject.lastError ? (
                          <span className='text-sm text-error-text'>{subject.lastError}</span>
                        ) : undefined
                      }
                    >
                      {targetMissing ? (
                        <Button onClick={handleRemoveBinding}>{t('remove-binding.label')}</Button>
                      ) : undefined}

                      {connector?.optionsSchema && !targetMissing && (
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
                    <Form.Row label={t('open-connection.label')}>
                      <Button onClick={handleOpenConnection}>{t('open-connection.label')}</Button>
                    </Form.Row>
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
