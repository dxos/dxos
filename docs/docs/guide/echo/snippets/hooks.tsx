//
// Copyright 2022 DXOS.org
//

import React, { useCallback } from 'react';
import { Client, Space } from '@dxos/client';
import { ClientProvider, useClient, useSelection } from '@dxos/react-client';

export const TaskList = (props: { space: Space }) => {
  const { space } = props;
  const rootItem = space.database.select({
    type: 'myapp:type/list'
  });
  const children = useSelection(
    rootItem.children().filter((item) => !item.deleted)
  );
  return (
    <>
      {children?.map((item) => (
        <div>{item.model.get('title')}</div>
      ))}
    </>
  );
};

const client = new Client();

export const App = () => {
  return <ClientProvider client={client}>
    <TaskList space={space} />
  </ClientProvider>
}
