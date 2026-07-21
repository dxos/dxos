//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import React, { useCallback } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { LayoutOperation, Paths } from '@dxos/app-toolkit';
import { useActiveSpace } from '@dxos/app-toolkit/ui';
import { Filter, Obj, Type } from '@dxos/echo';
import { useObject, useQuery } from '@dxos/echo-react';
import { SpaceOperation } from '@dxos/plugin-space';
import { Button, Panel, ScrollArea, useTranslation } from '@dxos/react-ui';
import { Form } from '@dxos/react-ui-form';
import { Listbox } from '@dxos/react-ui-list';

import { meta } from '#meta';

import { connectionDeckSubject } from '../../constants';
import { Connection } from '../../types';

// The add-connection action uses Form's `settings` variant for its labeled-row chrome
// (an action-mode `Form.Row`); there are no fields to bind, so the schema is empty.
const ACTIONS_SCHEMA = Schema.Struct({});
const ACTIONS_VALUES = {};

export type ConnectionSettingsArticleProps = Record<string, never>;

export const ConnectionSettingsArticle = (_props: ConnectionSettingsArticleProps) => {
  const { t } = useTranslation(meta.profile.key);
  const space = useActiveSpace();
  const { invokePromise } = useOperationInvoker();
  const connections = useQuery(space?.db, Filter.type(Connection.Connection));

  const handleAdd = useCallback(() => {
    if (!space) {
      return;
    }
    void invokePromise(SpaceOperation.OpenCreateObject, {
      target: space.db,
      typename: Type.getTypename(Connection.Connection),
    });
  }, [space, invokePromise]);

  const handleSelect = useCallback(
    (connection: Connection.Connection) => {
      const db = Obj.getDatabase(connection);
      if (!db) {
        return;
      }
      void invokePromise(LayoutOperation.Open, {
        subject: [connectionDeckSubject(Paths.getSpacePath(db.spaceId), connection.id)],
        navigation: 'immediate',
      });
    },
    [invokePromise],
  );

  return (
    <Panel.Root>
      <Panel.Content asChild>
        <ScrollArea.Root orientation='vertical'>
          <ScrollArea.Viewport>
            <Form.Root variant='settings' schema={ACTIONS_SCHEMA} values={ACTIONS_VALUES}>
              <Form.Viewport>
                <Form.Content>
                  <Form.Section title={t('connections.label')} description={t('connections.description')}>
                    <Form.Row label={t('add-connection.label')} description={t('connect-service.description')}>
                      <Button onClick={handleAdd}>{t('connect.label')}</Button>
                    </Form.Row>
                  </Form.Section>

                  {connections.length > 0 && (
                    <Form.Section title={t('connections.label')}>
                      <Listbox.Root>
                        <Listbox.Viewport>
                          <Listbox.Content aria-label={t('connections.label')}>
                            {connections.map((connection) => (
                              <ConnectionRow key={connection.id} connection={connection} onSelect={handleSelect} />
                            ))}
                          </Listbox.Content>
                        </Listbox.Viewport>
                      </Listbox.Root>
                    </Form.Section>
                  )}
                </Form.Content>
              </Form.Viewport>
            </Form.Root>
          </ScrollArea.Viewport>
        </ScrollArea.Root>
      </Panel.Content>
    </Panel.Root>
  );
};

/** One connection row; resolves the access-token ref reactively for its label. */
const ConnectionRow = ({
  connection,
  onSelect,
}: {
  connection: Connection.Connection;
  onSelect: (connection: Connection.Connection) => void;
}) => {
  const [accessToken] = useObject(connection.accessToken);
  const label =
    connection.name ??
    (accessToken
      ? `${accessToken.source}${accessToken.account ? ` · ${accessToken.account}` : ''}`
      : (connection.connectorId ?? connection.id));

  return (
    <Listbox.Item id={connection.id} classNames='cursor-pointer' onClick={() => onSelect(connection)}>
      <span className='truncate'>{label}</span>
    </Listbox.Item>
  );
};

ConnectionSettingsArticle.displayName = 'ConnectionSettingsArticle';
