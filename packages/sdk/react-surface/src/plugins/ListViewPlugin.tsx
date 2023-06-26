//
// Copyright 2023 DXOS.org
//

import React, { createContext, useContext, useState } from 'react';

import { Button, useTranslation } from '@dxos/aurora';
import { observer } from '@dxos/observable-object/react';

import { definePlugin } from '../framework';
import { GraphNode, useGraphContext } from './GraphPlugin';

export type ListViewItem = {
  id: string;
  text: string;
};

export type ListViewProps = {
  items?: ListViewItem[];
  onSelect?: (id: string) => void;
};

export const ListView = (props: ListViewProps) => {
  const { items } = props;
  return (
    <div>
      {items?.length
        ? items.map((item) => (
            <div key={item.id} onClick={() => props.onSelect?.(item.id)}>
              {item.text}
            </div>
          ))
        : 'no items'}
    </div>
  );
};

export type ListViewContextValue = {
  selected: GraphNode | null;
  setSelected(item: GraphNode | null): any;
};

const Context = createContext<ListViewContextValue>({
  selected: null,
  setSelected: () => {},
});

export const useListViewContext = () => useContext(Context);

export const ListViewContainer = observer(() => {
  const graph = useGraphContext();
  const { setSelected } = useListViewContext();
  const { t } = useTranslation('composer');

  const actions = Object.values(graph.actions).reduce((acc, actions) => [...acc, ...actions], []);

  return (
    <div>
      <div>
        {actions?.map((action) => (
          <Button variant='ghost' key={action.id} onClick={(event) => action.invoke(t, event)}>
            {Array.isArray(action.label) ? t(...action.label) : action.label}
          </Button>
        ))}
      </div>
      {Object.entries(graph.roots).map(([key, items]) => (
        <ListView
          key={key}
          items={items?.map((item) => ({
            id: item.id,
            text: Array.isArray(item.label) ? t(...item.label) : item.label,
          }))}
          onSelect={(id) => setSelected(items.find((item) => item.id === id) ?? null)}
        />
      ))}
    </div>
  );
});

export const ListViewPlugin = definePlugin({
  meta: {
    id: 'dxos:ListViewPlugin',
  },
  provides: {
    context: ({ children }) => {
      const [selected, setSelected] = useState<GraphNode | null>(null);

      const context: ListViewContextValue = {
        selected,
        setSelected,
      };

      return <Context.Provider value={context}>{children}</Context.Provider>;
    },
    components: { ListView: ListViewContainer },
  },
});
