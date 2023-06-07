//
// Copyright 2023 DXOS.org
//

import { GearSix, Placeholder } from '@phosphor-icons/react';
import React, { createContext, useContext, useState } from 'react';

import {
  Avatar,
  Tree,
  TreeItem,
  Button,
  DensityProvider,
  ElevationProvider,
  ThemeContext,
  Tooltip,
  useJdenticonHref,
  useSidebar,
  useThemeContext,
  useTranslation,
} from '@dxos/aurora';
import { getSize, mx, osTx } from '@dxos/aurora-theme';
import { observer } from '@dxos/observable-object/react';
import { useIdentity } from '@dxos/react-client';

import { definePlugin } from '../../framework';
import { GraphNode, useGraphContext } from '../GraphPlugin';
import { isSpace } from '../SpacePlugin';
import { FullSpaceTreeItem } from './FullSpaceTreeItem';

const TREE_VIEW_PLUGIN = 'dxos:TreeViewPlugin';

export type TreeViewProps = {
  items?: GraphNode[];
  onSelect?: (node: GraphNode) => void;
  selected: GraphNode | null;
};

export const TreeView = (props: TreeViewProps) => {
  const { items } = props;
  return (
    <Tree.Branch>
      {items?.length
        ? items.map((item) => {
            switch (true) {
              case isSpace(item.data):
                return (
                  <FullSpaceTreeItem space={item.data}>
                    <TreeView items={item.children} onSelect={props.onSelect} selected={props.selected} />
                  </FullSpaceTreeItem>
                );
              default:
                return (
                  <TreeItem.Root key={item.id} classNames='block' collapsible>
                    <TreeItem.Heading onClick={() => props.onSelect?.(item)}>{item.label}</TreeItem.Heading>
                    {item.children && (
                      <TreeItem.Body>
                        <TreeView items={item.children} onSelect={props.onSelect} selected={props.selected} />
                      </TreeItem.Body>
                    )}
                  </TreeItem.Root>
                );
            }
          })
        : 'no items'}
    </Tree.Branch>
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
  const { selected, setSelected } = useTreeView();

  const identity = useIdentity();
  const jdenticon = useJdenticonHref(identity?.identityKey.toHex() ?? '', 24);
  const themeContext = useThemeContext();
  const { t } = useTranslation('composer');
  const { sidebarOpen } = useSidebar(TREE_VIEW_PLUGIN);

  const actions = Object.values(graph.actions).reduce((acc, actions) => [...acc, ...actions], []);

  return (
    <ElevationProvider elevation='chrome'>
      <DensityProvider density='fine'>
        <ThemeContext.Provider value={{ ...themeContext, tx: osTx }}>
          <div role='none' className='flex flex-col bs-full'>
            <div role='none' className='shrink-0 flex items-center pli-1.5 plb-1.5'>
              <h1 className={mx('grow font-system-medium text-lg pli-1.5')}>{t('current app name')}</h1>
              {actions?.map((action) => (
                <Tooltip.Root key={action.id}>
                  <Tooltip.Trigger asChild>
                    <Button
                      variant='ghost'
                      key={action.id}
                      onClick={action.invoke}
                      classNames='pli-2 pointer-fine:pli-1'
                      {...(!sidebarOpen && { tabIndex: -1 })}
                    >
                      <span className='sr-only'>{action.label}</span>
                      <Placeholder className={getSize(4)} />
                    </Button>
                  </Tooltip.Trigger>
                  <Tooltip.Content classNames='z-[31]'>
                    {action.label}
                    <Tooltip.Arrow />
                  </Tooltip.Content>
                </Tooltip.Root>
              ))}
            </div>
            <div role='separator' className='bs-px mli-2.5 bg-neutral-500/20' />
            <Tree.Root role='none' classNames='grow min-bs-0 overflow-y-auto overscroll-contain'>
              {Object.entries(graph.roots).map(([key, items]) => (
                <TreeItem.Root key={key} classNames='flex flex-col plb-1.5 pis-1 pie-1.5'>
                  <TreeItem.Heading classNames='sr-only'>{key}</TreeItem.Heading>
                  <TreeView key={key} items={items} onSelect={setSelected} selected={selected} />
                </TreeItem.Root>
              ))}
            </Tree.Root>
            {identity && (
              <>
                <div role='separator' className='bs-px mli-2.5 bg-neutral-500/20' />
                <Avatar.Root size={6} variant='circle' status='active'>
                  <div
                    role='none'
                    className='shrink-0 flex items-center gap-1 pis-3 pie-1.5 plb-3 pointer-fine:pie-1.5 pointer-fine:plb-1.5'
                  >
                    <Avatar.Frame>
                      <Avatar.Fallback href={jdenticon} />
                    </Avatar.Frame>
                    <Avatar.Label classNames='grow text-sm'>
                      {identity.profile?.displayName ?? identity.identityKey.truncate()}
                    </Avatar.Label>
                    <Button
                      variant='ghost'
                      classNames='pli-2 pointer-fine:pli-1'
                      {...(!sidebarOpen && { tabIndex: -1 })}
                    >
                      <GearSix className={mx(getSize(4), 'rotate-90')} />
                    </Button>
                  </div>
                </Avatar.Root>
              </>
            )}
          </div>
        </ThemeContext.Provider>
      </DensityProvider>
    </ElevationProvider>
  );
});

export const TreeViewPlugin = definePlugin({
  meta: {
    id: TREE_VIEW_PLUGIN,
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
