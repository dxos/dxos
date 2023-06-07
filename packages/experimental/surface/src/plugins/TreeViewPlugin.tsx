//
// Copyright 2023 DXOS.org
//

import React, { createContext, useContext, useState } from 'react';

import { Button } from '@dxos/aurora';
import { observer } from '@dxos/observable-object/react';

import { definePlugin } from '../framework';
import { GraphNode, useGraphContext } from './GraphPlugin';

export type TreeViewProps = {
  items?: GraphNode[];
  onSelect?: (node: GraphNode) => void;
};

export const TreeView = (props: TreeViewProps) => {
  const { items } = props;
  return (
    <div className='ps-4'>
      {items?.length
        ? items.map((item) => (
            <div key={item.id}>
              <span onClick={() => props.onSelect?.(item)}>{item.label}</span>
              {item.children && <TreeView items={item.children} onSelect={props.onSelect} />}
            </div>
          ))
        : 'no items'}
    </div>
  );
};

export type TreeViewContextValue = {
  selected: GraphNode | null;
  setSelected(item: GraphNode | null): any;
};

const Context = createContext<TreeViewContextValue>({
  selected: null,
  setSelected: () => {},
});

export const useTreeView = () => useContext(Context);

export const TreeViewContainer = observer(() => {
  const graph = useGraphContext();
  const { setSelected } = useTreeView();

  const actions = Object.values(graph.actions).reduce((acc, actions) => [...acc, ...actions], []);

  return (
    <div>
      <div>
        {actions?.map((action) => (
          <Button variant='ghost' key={action.id} onClick={action.invoke}>
            {action.label}
          </Button>
        ))}
      </div>
      {Object.entries(graph.roots).map(([key, items]) => (
        <div key={key} className='ps-4'>
          {key}
          <TreeView key={key} items={items} onSelect={setSelected} />
        </div>
      ))}
    </div>
  );
});

export const TreeViewPlugin = definePlugin({
  meta: {
    id: 'dxos:TreeViewPlugin',
  },
  provides: {
    context: ({ children }) => {
      const [selected, setSelected] = useState<GraphNode | null>(null);

      const context: TreeViewContextValue = {
        selected,
        setSelected,
      };

      return <Context.Provider value={context}>{children}</Context.Provider>;
    },
    components: { TreeView: TreeViewContainer },
  },
});
