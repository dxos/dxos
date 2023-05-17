//
// Copyright 2023 DXOS.org
//

import React, { createContext, useContext, useEffect, useState } from 'react';

import { definePlugin, usePluginContext, Plugin } from '../framework';

export type MaybePromise<T> = T | Promise<T>;

export type ListViewItem = {
  text: string;
};

export type ListViewProps = {
  items?: ListViewItem[];
};

export const ListView = (props: ListViewProps) => {
  const { items } = props;
  return <div>{items?.length ? items.map((v, i) => <div key={i}>{v?.text}</div>) : 'no items'}</div>;
};

type GraphNode = {
  id: string;
  label: string;
};

type GraphPlugin = Plugin<{
  graph: {
    nodes(parent?: GraphNode): MaybePromise<GraphNode[]>;
  };
}>;

export type ListViewContextValue = {
  items: GraphNode[];
  setItems(items: GraphNode[]): any;
  selected: GraphNode | null;
  setSelected(item: GraphNode | null): any;
};

const Context = createContext<ListViewContextValue>({
  items: [],
  setItems: () => {},
  selected: null,
  setSelected: () => {}
});

export const useListViewContext = () => useContext(Context);

export const ListViewContainer = () => {
  const { items } = useListViewContext();
  return <ListView items={items?.map((g) => ({ text: g.label }))} />;
};

const getItems = async (plugins: GraphPlugin[]): Promise<GraphNode[]> => {
  return (await Promise.all(plugins.map((p) => p.provides.graph.nodes()))).flat();
};

export const ListViewPlugin = definePlugin({
  meta: {
    id: 'ListViewPlugin'
  },
  provides: {
    context: ({ children }) => {
      const { plugins } = usePluginContext();
      const graphPlugins = (plugins as GraphPlugin[]).filter((p) => p.provides?.graph);
      const [items, setItems] = useState<GraphNode[]>([]);
      const [selected, setSelected] = useState<GraphNode | null>(null);
      const initialValue: ListViewContextValue = {
        items,
        selected,
        setItems,
        setSelected
      };
      useEffect(() => {
        getItems(graphPlugins)
          .then((p) => setItems(p))
          .catch((err) => console.log(err));
      }, []);
      return <Context.Provider value={initialValue}>{children}</Context.Provider>;
    },
    components: { ListView: ListViewContainer }
  }
});
