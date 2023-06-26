//
// Copyright 2023 DXOS.org
//

import { DotsThreeVertical, GearSix, Placeholder } from '@phosphor-icons/react';
import React, { createContext, useContext, useRef, useState } from 'react';

import { useGraphContext } from '@braneframe/plugin-graph';
import { useSplitViewContext } from '@braneframe/plugin-splitview';
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
  DropdownMenu,
} from '@dxos/aurora';
import { getSize, mx, osTx } from '@dxos/aurora-theme';
import { createStore } from '@dxos/observable-object';
import { observer, useIdentity } from '@dxos/react-client';
import { Surface, definePlugin } from '@dxos/react-surface';

import { TreeView } from './components';

const TREE_VIEW_PLUGIN = 'dxos:TreeViewPlugin';

// TODO(wittjosiah): Derive graph nodes from selected.
export type TreeViewContextValue = {
  selected: string[];
};

const store = createStore<TreeViewContextValue>({ selected: [] });

const Context = createContext<TreeViewContextValue>(store);

export const useTreeView = () => useContext(Context);

export const uriToSelected = (uri: string) => {
  const [_, namespace, type, id, ...rest] = uri.split('/');
  return [`${namespace}:${type}/${id}`, ...rest];
};

export const selectedToUri = (selected: string[]) => '/' + selected.join('/').replace(':', '/');

export const TreeViewContainer = observer(() => {
  const graph = useGraphContext();

  const identity = useIdentity({ login: true });
  const jdenticon = useJdenticonHref(identity?.identityKey.toHex() ?? '', 24);
  const themeContext = useThemeContext();
  const { t } = useTranslation('composer');
  const { sidebarOpen } = useSidebar(TREE_VIEW_PLUGIN);
  const splitViewContext = useSplitViewContext();

  const suppressNextTooltip = useRef<boolean>(false);
  const [optionsTooltipOpen, setOptionsTooltipOpen] = useState(false);
  const [optionsMenuOpen, setOptionsMenuOpen] = useState(false);

  const [primary, secondary, ...actions] = Object.values(graph.actions).reduce(
    (acc, actions) => [...acc, ...actions],
    [],
  );
  const hoistedActions = [primary, secondary].filter(Boolean);

  return (
    <ElevationProvider elevation='chrome'>
      <DensityProvider density='fine'>
        <ThemeContext.Provider value={{ ...themeContext, tx: osTx }}>
          <div role='none' className='flex flex-col bs-full'>
            <div role='separator' className='order-1 bs-px mli-2.5 bg-neutral-500/20' />
            <Tree.Root role='none' classNames='order-1 grow min-bs-0 overflow-y-auto overscroll-contain'>
              {Object.entries(graph.roots).map(([key, items]) => (
                <TreeItem.Root key={key} classNames='flex flex-col plb-1.5 pis-1 pie-1.5'>
                  <TreeItem.Heading classNames='pl-2'>{t('plugin name', { ns: key })}</TreeItem.Heading>
                  <TreeView key={key} items={items} parent={key} />
                </TreeItem.Root>
              ))}
            </Tree.Root>
            <div role='none' className='order-first shrink-0 flex items-center pli-1.5 plb-1.5 order-0'>
              <h1 className={mx('grow font-system-medium text-lg pli-1.5')}>{t('current app name')}</h1>
              {hoistedActions?.map((action) => (
                <Tooltip.Root key={action.id}>
                  <Tooltip.Trigger asChild>
                    <Button
                      variant='ghost'
                      key={action.id}
                      {...(action.testId && { 'data-testid': action.testId })}
                      onClick={(event) => action.invoke(t, event)}
                      classNames='pli-2 pointer-fine:pli-1'
                      {...(!sidebarOpen && { tabIndex: -1 })}
                    >
                      <span className='sr-only'>{Array.isArray(action.label) ? t(...action.label) : action.label}</span>
                      {action.icon ? <action.icon className={getSize(4)} /> : <Placeholder className={getSize(4)} />}
                    </Button>
                  </Tooltip.Trigger>
                  <Tooltip.Content classNames='z-[31]'>
                    {Array.isArray(action.label) ? t(...action.label) : action.label}
                    <Tooltip.Arrow />
                  </Tooltip.Content>
                </Tooltip.Root>
              ))}
              <Tooltip.Root
                open={optionsTooltipOpen}
                onOpenChange={(nextOpen) => {
                  if (suppressNextTooltip.current) {
                    setOptionsTooltipOpen(false);
                    suppressNextTooltip.current = false;
                  } else {
                    setOptionsTooltipOpen(nextOpen);
                  }
                }}
              >
                <Tooltip.Portal>
                  <Tooltip.Content classNames='z-[31]' side='bottom'>
                    {t('tree options label')}
                    <Tooltip.Arrow />
                  </Tooltip.Content>
                </Tooltip.Portal>
                <DropdownMenu.Root
                  {...{
                    open: optionsMenuOpen,
                    onOpenChange: (nextOpen: boolean) => {
                      if (!nextOpen) {
                        suppressNextTooltip.current = true;
                      }
                      return setOptionsMenuOpen(nextOpen);
                    },
                  }}
                >
                  <DropdownMenu.Trigger asChild>
                    <Tooltip.Trigger asChild>
                      <Button
                        variant='ghost'
                        classNames='shrink-0 pli-2 pointer-fine:pli-1'
                        {...(!sidebarOpen && { tabIndex: -1 })}
                      >
                        <DotsThreeVertical className={getSize(4)} />
                      </Button>
                    </Tooltip.Trigger>
                  </DropdownMenu.Trigger>
                  <DropdownMenu.Portal>
                    <DropdownMenu.Content classNames='z-[31]'>
                      {actions.map((action) => (
                        <DropdownMenu.Item
                          key={action.id}
                          onClick={(event) => {
                            // todo(thure): Why does Dialog’s modal-ness cause issues if we don’t explicitly close the menu here?
                            suppressNextTooltip.current = true;
                            setOptionsMenuOpen(false);
                            void action.invoke(t, event);
                          }}
                          classNames='gap-2'
                        >
                          {action.icon && <action.icon className={getSize(4)} />}
                          <span>{Array.isArray(action.label) ? t(...action.label) : action.label}</span>
                        </DropdownMenu.Item>
                      ))}
                      <DropdownMenu.Arrow />
                    </DropdownMenu.Content>
                  </DropdownMenu.Portal>
                </DropdownMenu.Root>
              </Tooltip.Root>
            </div>
            {identity && (
              <>
                <div role='separator' className='order-last bs-px mli-2.5 bg-neutral-500/20' />
                <Avatar.Root size={6} variant='circle' status='active'>
                  <div
                    role='none'
                    className='order-last shrink-0 flex items-center gap-1 pis-3 pie-1.5 plb-3 pointer-fine:pie-1.5 pointer-fine:plb-1.5'
                  >
                    <Avatar.Frame>
                      <Avatar.Fallback href={jdenticon} />
                    </Avatar.Frame>
                    <Avatar.Label classNames='grow text-sm'>
                      {identity.profile?.displayName ?? identity.identityKey.truncate()}
                    </Avatar.Label>
                    <Tooltip.Root>
                      <Tooltip.Trigger asChild>
                        <Button
                          variant='ghost'
                          classNames='pli-2 pointer-fine:pli-1'
                          {...(!sidebarOpen && { tabIndex: -1 })}
                          onClick={() => {
                            splitViewContext.dialogOpen = true;
                            splitViewContext.dialogContent = 'dxos:SplitViewPlugin/ProfileSettings';
                          }}
                        >
                          <span className='sr-only'>{t('settings dialog title', { ns: 'os' })}</span>
                          <GearSix className={mx(getSize(4), 'rotate-90')} />
                        </Button>
                      </Tooltip.Trigger>
                      <Tooltip.Content>
                        {t('settings dialog title', { ns: 'os' })}
                        <Tooltip.Arrow />
                      </Tooltip.Content>
                    </Tooltip.Root>
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

export type TreeViewProvides = {
  treeView: TreeViewContextValue;
};

export const TreeViewPlugin = definePlugin<TreeViewProvides, {}>({
  meta: {
    id: TREE_VIEW_PLUGIN,
  },
  provides: {
    treeView: store,
    context: ({ children }) => {
      return <Context.Provider value={store}>{children}</Context.Provider>;
    },
    components: {
      default: observer(() => {
        const { selected } = useTreeView();
        const [plugin] = selected[0]?.split('/') ?? [];

        return selected ? (
          <Surface
            component='dxos:SplitViewPlugin/SplitView'
            surfaces={{
              sidebar: { component: 'dxos:TreeViewPlugin/TreeView' },
              main: { component: `${plugin}/Main` },
            }}
          />
        ) : (
          <Surface
            component='dxos:SplitViewPlugin/SplitView'
            surfaces={{
              sidebar: { component: 'dxos:TreeViewPlugin/TreeView' },
              main: { component: 'dxos:SplitViewPlugin/SplitViewMainContentEmpty' },
            }}
          />
        );
      }),
      TreeView: TreeViewContainer,
    },
  },
});
