//
// Copyright 2023 DXOS.org
//

import React, { PropsWithChildren, createContext, useContext, useMemo } from 'react';

import { definePlugin, usePluginContext } from '../framework';

export type ListViewProps = {
  items?: string[];
};

export const ListView = (props: ListViewProps) => {
  const { items } = props;
  return <div>{items?.length ? items.map((v, i) => <div key={i}>{v}</div>) : 'no items'}</div>;
};

const Context = createContext<{
  items: string[];
  selectedIndex: number | undefined;
}>({ selectedIndex: undefined, items: [] });

export const useListViewContext = () => useContext(Context);

export const ListViewContainer = () => {
  const { items } = useListViewContext();
  return <ListView items={items} />;
};

export const ListViewPlugin = definePlugin({
  meta: {
    id: 'ListViewPlugin'
  },
  provides: {
    context: (props: PropsWithChildren) => {
      const { plugins } = usePluginContext();
      const initialValue = useMemo(() => {
        return {
          selectedIndex: -1,
          items: plugins.map((p) => p.provides.graph?.getStrings() ?? []).flat()
        };
      }, [plugins]);
      return <Context.Provider value={initialValue}>{props.children}</Context.Provider>;
    },
    components: { ListView: ListViewContainer }
  }
});
