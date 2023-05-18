//
// Copyright 2023 DXOS.org
//

import React, { UIEvent, FC, createContext, useContext, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';

import { MulticastObservable } from '@dxos/async';
import { useMulticastObservable } from '@dxos/react-async';

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

export type GraphPluginProvides = {
  graph: {
    nodes?: (plugins: Plugin[], parent?: GraphNode) => MulticastObservable<GraphNode[]>;
    actions?: (plugins: Plugin[], parent?: GraphNode) => MulticastObservable<GraphNodeAction[]>;
  };
};

export type GraphPlugin = Plugin<GraphPluginProvides>;

export type ListViewContextValue = {
  items: GraphNode[];
  actions: GraphNodeAction[];
  selected: GraphNode | null;
  setSelected(item: GraphNode | null): any;
};

const Context = createContext<ListViewContextValue>({
  items: [],
  actions: [],
  selected: null,
  setSelected: () => {}
});

export const useListViewContext = () => useContext(Context);

export const ListViewContainer = () => {
  const { items, actions, selected, setSelected } = useListViewContext();

  const { spaceId } = useParams();
  const navigate = useNavigate();
  useEffect(() => {
    console.log({ selected, spaceId });
    if (selected && selected?.id !== spaceId) {
      navigate(`/space/${selected.id}`);
    }
  }, [selected, spaceId]);

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

export const ListViewPlugin = definePlugin({
  meta: {
    id: 'dxos:ListViewPlugin'
  },
  provides: {
    context: ({ children }) => {
      const { plugins } = usePluginContext();
      const [selected, setSelected] = useState<GraphNode | null>(null);

      const items = useMulticastObservable(
        graphPlugins(plugins)
          .map((plugin) => plugin.provides.graph.nodes?.(plugins))
          .filter((nodes): nodes is MulticastObservable<GraphNode[]> => Boolean(nodes))
          .reduce((acc, observable) => acc.losslessConcat((a, b) => a.concat(...b), observable))
          .reduce((acc, actions) => acc.concat(...actions))
      );

      const actions = useMulticastObservable(
        graphPlugins(plugins)
          .map((plugin) => plugin.provides.graph.actions?.(plugins))
          .filter((nodes): nodes is MulticastObservable<GraphNodeAction[]> => Boolean(nodes))
          .reduce((acc, observable) => acc.losslessConcat((a, b) => a.concat(...b), observable))
          .reduce((acc, actions) => acc.concat(...actions))
      );

      const context: ListViewContextValue = {
        items,
        actions,
        selected,
        setSelected
      };

      return <Context.Provider value={context}>{children}</Context.Provider>;
    },
    components: { ListView: ListViewContainer }
  }
});
