//
// Copyright 2022 DXOS.org
//

import React from 'react';
import { createRoot } from 'react-dom/client';
import { Space } from '@dxos/client';
import {
  ClientProvider,
  useSpaces,
  useSpace,
  useOrCreateFirstSpace,
  useQuery,
  id
} from '@dxos/react-client';

export const TaskList = (props: { space: Space }) => {
  const { space } = props;
  const tasks = useQuery(space, { type: 'task' });
  return (
    <>
      {tasks?.map((item) => (
        <div key={item[id]}>{item.model.get('title')}</div>
      ))}
    </>
  );
};

export const App = () => {
  // usually space IDs are in the URL like in params.id: 
  const space1 = useSpace('<space_key_goes_here>');
  
  // get all spaces
  const spaces = useSpaces();
  const space2 = spaces?.[0]; // spaces may be null at first
  
  // get or create a first space:
  const space3 = useOrCreateFirstSpace();
  return <TaskList space={space3} />;
};

const root = createRoot(document.getElementById('root')!);
root.render(
  <ClientProvider>
    <App />
  </ClientProvider>
);
