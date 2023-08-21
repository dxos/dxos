//
// Copyright 2023 DXOS.org
//

import { DotsThreeVertical, GearSix, Placeholder } from '@phosphor-icons/react';
import React, { useRef, useState } from 'react';

import { useGraph } from '@braneframe/plugin-graph';
import { useSplitView } from '@braneframe/plugin-splitview';
import {
  Avatar,
  Tree,
  TreeItem,
  Button,
  DensityProvider,
  ElevationProvider,
  Tooltip,
  useJdenticonHref,
  useSidebars,
  useTranslation,
  DropdownMenu,
} from '@dxos/aurora';
import { getSize, mx } from '@dxos/aurora-theme';
import { useIdentity } from '@dxos/react-client/halo';

import { TREE_VIEW_PLUGIN } from '../types';
import { sortActions } from '../util';
import { TreeView } from './TreeView';

export const TreeViewContainer = () => {
  const { graph } = useGraph();

  const identity = useIdentity({ login: true });
  const jdenticon = useJdenticonHref(identity?.identityKey.toHex() ?? '', 24);
  const { t } = useTranslation(TREE_VIEW_PLUGIN);
  const { navigationSidebarOpen } = useSidebars(TREE_VIEW_PLUGIN);
  const splitViewContext = useSplitView();

  const suppressNextTooltip = useRef<boolean>(false);
  const [optionsTooltipOpen, setOptionsTooltipOpen] = useState(false);
  const [optionsMenuOpen, setOptionsMenuOpen] = useState(false);

  const branches = graph.root.children;
  const [primary, secondary, ...actions] = sortActions(graph.root.actions);
  const hoistedActions = [primary, secondary].filter(Boolean);

  return (
    <ElevationProvider elevation='chrome'>
      <DensityProvider density='fine'>
        <div role='none' className='flex flex-col bs-full'>
          <div role='separator' className='order-1 bs-px mli-2.5 bg-neutral-500/20' />
          <Tree.Root role='none' classNames='order-1 grow min-bs-0 overflow-y-auto overscroll-contain scroll-smooth'>
            {branches.map((branch) => (
              <TreeItem.Root key={branch.id} classNames='flex flex-col plb-1.5 pis-1 pie-1.5'>
                <TreeItem.Heading classNames='pl-2'>
                  {typeof branch.label === 'string' ? branch.label : t(...branch.label)}
                </TreeItem.Heading>
                <TreeView items={branch.children} parent={branch} />
              </TreeItem.Root>
            ))}
          </Tree.Root>
          <div role='none' className='order-first shrink-0 flex items-center pli-1.5 plb-1.5 order-0'>
            <h1 className={mx('grow font-system-medium text-lg pli-1.5')}>{t('current app name', { ns: 'appkit' })}</h1>
            {hoistedActions?.map((action) => (
              <Tooltip.Root key={action.id}>
                <Tooltip.Trigger asChild>
                  <Button
                    variant='ghost'
                    key={action.id}
                    {...(action.properties.testId && { 'data-testid': action.properties.testId })}
                    onClick={() => action.invoke()}
                    classNames='pli-2 pointer-fine:pli-1'
                    {...(!navigationSidebarOpen && { tabIndex: -1 })}
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
                      {...(!navigationSidebarOpen && { tabIndex: -1 })}
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
                          // TODO(thure): Why does Dialog’s modal-ness cause issues if we don’t explicitly close the menu here?
                          suppressNextTooltip.current = true;
                          setOptionsMenuOpen(false);
                          void action.invoke();
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
                        {...(!navigationSidebarOpen && { tabIndex: -1 })}
                        onClick={() => {
                          splitViewContext.dialogOpen = true;
                          splitViewContext.dialogContent = 'dxos.org/plugin/splitview/ProfileSettings';
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
      </DensityProvider>
    </ElevationProvider>
  );
};
