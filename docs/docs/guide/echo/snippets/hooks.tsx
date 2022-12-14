//
// Copyright 2022 DXOS.org
//

import React from 'react';
import { Space } from '@dxos/client';
import { ClientProvider, useSpaces, useSelection } from '@dxos/react-client';
import { createRoot } from 'react-dom/client';

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

export const App = () => {
  const spaces = useSpaces();
  // usually space IDs are in the URL and `useSpace(id)` would be appropriate
  const space = spaces[0];
  return <TaskList space={space} />;
};

const root = createRoot(document.getElementById('root')!);
root.render(
  <ClientProvider>
    <App />
  </ClientProvider>
);
