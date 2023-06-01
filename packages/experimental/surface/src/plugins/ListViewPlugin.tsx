//
// Copyright 2023 DXOS.org
//

import React, { UIEvent, FC, createContext, useContext, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';

import { Button } from '@dxos/aurora';
import { observer } from '@dxos/observable-object/react';

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

export type GraphNode<TDatum = any> = {
  id: string;
  label: string;
  description?: string;
  icon?: FC;
  data?: TDatum; // nit about naming this
  actions?: GraphNodeAction[];
  children?: GraphNode[];
  parent?: GraphNode;
};

export type GraphNodeAction = {
  id: string;
  label: string;
  icon?: FC;
  invoke: (event: UIEvent) => MaybePromise<void>;
};

export type GraphPluginProvides = {
  graph: {
    nodes?: (plugins: Plugin[], parent?: GraphNode) => GraphNode[];
    actions?: (plugins: Plugin[], parent?: GraphNode) => GraphNodeAction[];
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
  setSelected: () => {},
});

export const useListViewContext = () => useContext(Context);

export const ListViewContainer = () => {
  const { items, actions, selected, setSelected } = useListViewContext();

  const { spaceId } = useParams();
  const navigate = useNavigate();
  useEffect(() => {
    if (selected && selected?.id !== spaceId) {
      navigate(`/space/${selected.id}`);
    }
  }, [selected, spaceId]);

  return (
    <div>
      <div>
        {actions?.map((action) => (
          <Button variant='ghost' key={action.id} onClick={action.invoke}>
            {action.label}
          </Button>
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
    id: 'dxos:ListViewPlugin',
  },
  provides: {
    context: observer(({ children }) => {
      const { plugins } = usePluginContext();
      const [selected, setSelected] = useState<GraphNode | null>(null);

      const items = graphPlugins(plugins)
        .flatMap((plugin) => plugin.provides.graph.nodes?.(plugins))
        .filter((node): node is GraphNode => Boolean(node));

      const actions = graphPlugins(plugins)
        .flatMap((plugin) => plugin.provides.graph.actions?.(plugins))
        .filter((node): node is GraphNodeAction => Boolean(node));

      const context: ListViewContextValue = {
        items,
        actions,
        selected,
        setSelected,
      };

      return <Context.Provider value={context}>{children}</Context.Provider>;
    }),
    components: { ListView: ListViewContainer },
  },
});
