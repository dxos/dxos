//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import React, { useCallback, useMemo } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { LayoutOperation, Paths } from '@dxos/app-toolkit';
import { Filter, Obj, Query, Relation } from '@dxos/echo';
import { SpaceOperation } from '@dxos/plugin-space';
import { useObject, useQuery } from '@dxos/react-client/echo';
import { Button, Panel, ScrollArea, useTranslation } from '@dxos/react-ui';
import { Form } from '@dxos/react-ui-form';

import { useConnector } from '#hooks';
import { meta } from '#meta';
import { Connection, SyncBinding } from '#types';

import { connectionDeckSubject } from '../../constants';

const EMPTY_SCHEMA = Schema.Struct({});
const EMPTY_VALUES = {};

export type ConnectorCompanionProps = {
  companionTo: Obj.Any;
  role?: string;
  attendableId?: string;
};

/**
 * Companion panel focused on the {@link SyncBinding} that connects the primary
 * plank's object to its external service. Shows the connection header (name and
 * account) and the sync status for that binding. When the object has multiple
 * bindings (unusual edge case) only the first is shown.
 */
export const ConnectorCompanion = ({ companionTo, role }: ConnectorCompanionProps) => {
  const { t } = useTranslation(meta.profile.key);
  const db = Obj.getDatabase(companionTo);
  const { invokePromise } = useOperationInvoker();

  // All bindings targeting this object — pick the first.
  const allBindings = useQuery(
    db,
    db ? Query.select(Filter.id(companionTo.id)).targetOf(SyncBinding.SyncBinding) : Query.select(Filter.nothing()),
  );
  const binding = allBindings.find(SyncBinding.instanceOf);

  // Traverse to the source connection via the same path.
  const allConnections = useQuery(
    db,
    db
      ? Query.select(Filter.id(companionTo.id)).targetOf(SyncBinding.SyncBinding).source()
      : Query.select(Filter.nothing()),
  );
  const connection = allConnections.find(Connection.instanceOf);

  const [connectionObj] = useObject(connection);
  const [accessToken] = useObject(connection?.accessToken);
  const connector = useConnector(connectionObj?.connectorId);

  // Detect whether the binding's target has been deleted so a cleanup option can be offered.
  const target = useMemo(() => {
    if (!binding) {
      return undefined;
    }
    try {
      return Relation.getTarget(binding);
    } catch {
      return undefined;
    }
  }, [binding]);
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
    if (!binding) {
      return;
    }
    void invokePromise(SpaceOperation.RemoveObjects, { objects: [binding] });
  }, [invokePromise, binding]);

  // Seed the options form from the binding's current options; changes persist via Relation.update.
  const optionsDefaultValues = useMemo(() => ({ ...(binding?.options ?? {}) }), [binding?.options]);
  const handleOptionsChanged = useCallback(
    (values: Record<string, any>) => {
      if (!binding) {
        return;
      }
      Relation.update(binding, (binding) => {
        binding.options = { ...values };
      });
    },
    [binding],
  );

  if (!connection || !binding) {
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
    : binding.lastSyncAt
      ? `${t('last-sync.label')}: ${new Date(binding.lastSyncAt).toLocaleString()}`
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
                        !targetMissing && binding.lastError ? (
                          <span className='text-sm text-error-text'>{binding.lastError}</span>
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
