//
// Copyright 2023 DXOS.org
//

import { Circle, DotsThreeVertical, Placeholder } from '@phosphor-icons/react';
import React, { useRef, useState } from 'react';

import {
  Button,
  DropdownMenu,
  ListItem,
  Tooltip,
  TreeItem,
  useDensityContext,
  useMediaQuery,
  useSidebar,
  useTranslation,
} from '@dxos/aurora';
import { appTx, getSize, mx } from '@dxos/aurora-theme';
import { observer } from '@dxos/react-client';

import { GraphNode } from '../GraphPlugin';
import { useTreeView } from './TreeViewPlugin';

export const LeafTreeItem = observer(({ node }: { node: GraphNode }) => {
  const { sidebarOpen, closeSidebar } = useSidebar();
  // TODO(wittjosiah): Update namespace.
  const { t } = useTranslation('composer');
  const density = useDensityContext();
  const [isLg] = useMediaQuery('lg', { ssr: false });
  const treeView = useTreeView();

  const active = node.id === treeView.selected.at(-1);
  const modified = node.attributes?.modified ?? false;
  const Icon = node.icon ?? Placeholder;

  const suppressNextTooltip = useRef<boolean>(false);
  const [optionsTooltipOpen, setOptionsTooltipOpen] = useState(false);
  const [optionsMenuOpen, setOptionsMenuOpen] = useState(false);

  return (
    <TreeItem.Root classNames='pis-7 pointer-fine:pis-6 pointer-fine:pie-0 flex'>
      <TreeItem.Heading
        asChild
        data-testid='spacePlugin.documentTreeItemHeading'
        classNames={appTx(
          'button.root',
          'tree-item__heading--link',
          { variant: 'ghost', density },
          'grow text-base p-0 font-normal flex items-start gap-1 pointer-fine:min-height-6',
        )}
      >
        <button
          role='link'
          {...(!sidebarOpen && { tabIndex: -1 })}
          data-itemid={node.id}
          onClick={() => {
            // TODO(wittjosiah): Make recursive.
            treeView.selected = node.parent ? [node.parent.id, node.id] : [node.id];
            !isLg && closeSidebar();
          }}
          className='text-start flex gap-2'
        >
          <Icon weight='regular' className={mx(getSize(4), 'shrink-0 mbs-2')} />
          <p className={mx(modified && 'italic', 'grow mbs-1')}>
            {Array.isArray(node.label) ? t(...node.label) : node.label}
          </p>
        </button>
      </TreeItem.Heading>
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
            {t('document options label')}
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
                classNames='shrink-0 pli-2 pointer-fine:pli-1 self-start'
                {...(!sidebarOpen && { tabIndex: -1 })}
              >
                <DotsThreeVertical className={getSize(4)} />
              </Button>
            </Tooltip.Trigger>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content classNames='z-[31]'>
              {node.actions?.map((action) => (
                <DropdownMenu.Item
                  key={action.id}
                  onClick={(event) => {
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
      <ListItem.Endcap classNames='is-8 pointer-fine:is-6 flex items-center'>
        <Circle
          weight='fill'
          className={mx(getSize(3), 'text-primary-500 dark:text-primary-300', !active && 'invisible')}
        />
      </ListItem.Endcap>
    </TreeItem.Root>
  );
});
