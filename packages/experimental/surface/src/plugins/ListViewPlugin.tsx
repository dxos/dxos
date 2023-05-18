//
// Copyright 2023 DXOS.org
//

import React, { UIEvent, FC, createContext, useContext, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';

import { definePlugin, usePluginContext, Plugin } from '../framework';

export type MaybePromise<T> = T | Promise<T>;

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

type GraphNode<TDatum = any> = {
  id: string;
  label: string;
  description?: string;
  icon?: FC;
  data?: TDatum;
  actions?: GraphNodeAction[];
  children?: GraphNode[];
  parent?: GraphNode;
};

type GraphNodeAction = {
  id: string;
  label: string;
  icon?: FC;
  invoke: (event: UIEvent) => MaybePromise<void>;
};

// TODO(wittjosiah): Observable.
export type GraphPluginProvides = {
  graph: {
    nodes?: (plugins: Plugin[], parent?: GraphNode) => GraphNode[];
    actions?: (plugins: Plugin[], parent?: GraphNode) => GraphNodeAction[];
  };
};

export type GraphPlugin = Plugin<GraphPluginProvides>;

export type ListViewContextValue = {
  items: GraphNode[];
  setItems(items: GraphNode[]): any;
  actions: GraphNodeAction[];
  setActions(actions: GraphNodeAction[]): any;
  selected: GraphNode | null;
  setSelected(item: GraphNode | null): any;
};

const Context = createContext<ListViewContextValue>({
  items: [],
  setItems: () => {},
  actions: [],
  setActions: () => {},
  selected: null,
  setSelected: () => {}
});

export const useListViewContext = () => useContext(Context);

export const ListViewContainer = () => {
  const { items, actions, setSelected } = useListViewContext();
  return (
    <div>
      <div>
        {actions?.map((action) => (
          <button key={action.id} onClick={action.invoke}>
            {action.label}
          </button>
        ))}
      </div>
      <ListView
        items={items?.map((item) => ({ id: item.id, text: item.label }))}
        onSelect={(id) => setSelected(items.find((item) => item.id === id) ?? null)}
      />
    </div>
  );
};

const graphPlugins = (plugins: Plugin[]): GraphPlugin[] => {
  return (plugins as GraphPlugin[]).filter((p) => p.provides?.graph);
};

const getItems = async (plugins: Plugin[]): Promise<GraphNode[]> => {
  return (await Promise.all(graphPlugins(plugins).map((p) => p.provides.graph.nodes?.(plugins) ?? []))).flat();
};

const getActions = async (plugins: Plugin[]): Promise<GraphNodeAction[]> => {
  return (await Promise.all(graphPlugins(plugins).map((p) => p.provides.graph.actions?.(plugins) ?? []))).flat();
};

export const ListViewPlugin = definePlugin({
  meta: {
    id: 'dxos:ListViewPlugin'
  },
  provides: {
    context: ({ children }) => {
      const { plugins } = usePluginContext();
      const [items, setItems] = useState<GraphNode[]>([]);
      const [actions, setActions] = useState<GraphNodeAction[]>([]);
      const [selected, setSelected] = useState<GraphNode | null>(null);
      const initialValue: ListViewContextValue = {
        items,
        actions,
        selected,
        setItems,
        setActions,
        setSelected
      };

      useEffect(() => {
        const timeout = setTimeout(async () => {
          const items = await getItems(plugins);
          const actions = await getActions(plugins);

          setItems(items);
          setActions(actions);
        });

        return () => clearTimeout(timeout);
      }, []);

      const { spaceId } = useParams();
      const navigate = useNavigate();
      useEffect(() => {
        console.log({ selected, spaceId });
        if (selected && selected?.id !== spaceId) {
          navigate(`/space/${selected.id}`);
        }
      }, [selected, spaceId]);

      return <Context.Provider value={initialValue}>{children}</Context.Provider>;
    },
    components: { ListView: ListViewContainer }
  }
});
