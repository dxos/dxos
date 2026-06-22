//
// Copyright 2026 DXOS.org
//

import React, { useCallback } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { LayoutOperation, Paths } from '@dxos/app-toolkit';
import { useActiveSpace } from '@dxos/app-toolkit/ui';
import { Filter, Obj, Type } from '@dxos/echo';
import { SpaceOperation } from '@dxos/plugin-space';
import { useObject, useQuery } from '@dxos/react-client/echo';
import { Button, useTranslation } from '@dxos/react-ui';
import { Settings } from '@dxos/react-ui-form';
import { Listbox } from '@dxos/react-ui-list';

import { meta } from '#meta';

import { connectionDeckSubject } from '../../constants';
import { Connection } from '../../types';

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
    <Settings.Viewport>
      <Settings.Section title=''>
        <Settings.Item
          title={t('add-connection.label', { defaultValue: 'Add connection' })}
          description={t('connect-service.description', {
            defaultValue: 'Link an external service to this space.',
          })}
        >
          <Button onClick={handleAdd}>{t('connect.label', { defaultValue: 'Connect' })}</Button>
        </Settings.Item>
      </Settings.Section>

      {connections.length > 0 && (
        <Settings.Section title={t('connections.label', { defaultValue: 'Connections' })}>
          <Listbox.Root>
            <Listbox.Viewport>
              <Listbox.Content aria-label={t('connections.label', { defaultValue: 'Connections' })}>
                {connections.map((connection) => (
                  <ConnectionRow key={connection.id} connection={connection} onSelect={handleSelect} />
                ))}
              </Listbox.Content>
            </Listbox.Viewport>
          </Listbox.Root>
        </Settings.Section>
      )}
    </Settings.Viewport>
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
