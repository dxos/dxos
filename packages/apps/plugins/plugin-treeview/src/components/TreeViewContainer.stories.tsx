//
// Copyright 2023 DXOS.org
//

import React, { PropsWithChildren } from 'react';

import '@dxosTheme';
import { GraphStore } from '@braneframe/plugin-graph';
import { PublicKey } from '@dxos/client';

import { TreeViewContext } from '../TreeViewContext';
import { TreeView } from './TreeViewContainer';

export default {
  component: TreeView,
  actions: { argTypesRegex: '^on.*' },
};

const Sidebar = (props: PropsWithChildren) => <div className='w-80 h-96 shadow-lg'>{props.children}</div>;

const store = new GraphStore();

const [root] = store.root.add({
  id: 'root',
  label: 'root',
});

root.add({
  id: 'node1',
  label: 'node1',
});

root.add({
  id: 'node2',
  label: 'node2',
});

export const Empty = (props: any) => {
  return (
    <Sidebar>
      <TreeView {...props} />
    </Sidebar>
  );
};

export const Basic = () => {
  return (
    <Sidebar>
      <TreeViewContext.Provider value={{ active: undefined, activeNode: undefined }}>
        <TreeView
          identity={{
            identityKey: PublicKey.random(),
          }}
          version={{
            commitHash: 'cafebabe',
            timestamp: new Date().toISOString(),
            version: '1.0.0',
          }}
          graphNodes={store.root.children}
        />
      </TreeViewContext.Provider>
    </Sidebar>
  );
};
