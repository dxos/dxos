//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import { type Node } from '@dxos/app-graph';
import { Button, type ButtonProps, Icon, IconButton, toLocalizedString, useTranslation } from '@dxos/react-ui';
import { Tree } from '@dxos/react-ui-list';
import { Tabs } from '@dxos/react-ui-tabs';
import { hoverableControlItem, hoverableOpenControlItem, mx } from '@dxos/react-ui-theme';

import { useLoadDescendents } from '../../hooks';
import { NAVTREE_PLUGIN } from '../../meta';
import { l0ItemType } from '../../util';
import { useNavTreeContext } from '../NavTreeContext';
import { NavTreeItemColumns } from '../NavTreeItem';

const headingBackButtonLabel = 'inset-0 min-is-0 truncate flex items-center pis-2';

const TitleButton = ({ title, onClick }: { title: string } & Pick<ButtonProps, 'onClick'>) => {
  return (
    <Button
      variant='ghost'
      classNames='pli-1 flex-1 group text-start justify-start bs-[--rail-action] font-normal'
      onClick={onClick}
    >
      <Icon icon='ph--caret-left--bold' size={3} />
      <span className={mx(headingBackButtonLabel)}>{title}</span>
    </Button>
  );
};

export type L1PanelProps = {
  open?: boolean;
  item: Node<any>;
  path: string[];
  currentItemId: string;
  onBack?: () => void;
};

const L1Panel = ({ open, item, path, currentItemId, onBack }: L1PanelProps) => {
  const { isAlternateTree, setAlternateTree, ...navTreeContext } = useNavTreeContext();
  const { t } = useTranslation(NAVTREE_PLUGIN);

  // TODO(wittjosiah): Support multiple alternate trees.
  const alternateTree = navTreeContext.useItems(item, { disposition: 'alternate-tree' })[0];
  const alternatePath = useMemo(() => [...path, item.id], [item.id, path]);
  const handleOpen = useCallback(() => setAlternateTree?.(alternatePath, true), [alternatePath, setAlternateTree]);
  const isAlternate = isAlternateTree?.(alternatePath, item) ?? false;
  const useAlternateItems = useCallback(
    (node?: Node, { disposition }: { disposition?: string } = {}) => {
      // TODO(wittjosiah): Sorting is expensive, limit to necessary items for now.
      return navTreeContext.useItems(node, { disposition, sort: node?.id === alternateTree.id });
    },
    [navTreeContext, alternateTree],
  );

  const handleBack = useCallback(() => {
    if (isAlternate) {
      setAlternateTree?.(alternatePath, false);
    } else {
      onBack?.();
    }
  }, [isAlternate, onBack, alternatePath, setAlternateTree]);

  const title = toLocalizedString(item.properties.label, t);
  const backCapable = item.id.startsWith('!') || isAlternate;

  return (
    <Tabs.Tabpanel
      key={item.id}
      value={item.id}
      classNames={[
        'absolute inset-block-0 inline-end-0',
        'is-[calc(100%-var(--l0-size))] lg:is-[--l1-size] grid-cols-1 grid-rows-[var(--rail-size)_1fr]',
        'pbs-[env(safe-area-inset-top)]',
        item.id === currentItemId && 'grid',
      ]}
      tabIndex={-1}
      aria-label={title}
      {...(!open && { inert: 'true' })}
    >
      {item.id === currentItemId && (
        <>
          <h2 className='flex items-center border-be border-subduedSeparator app-drag pli-1 density-coarse'>
            {backCapable ? (
              <TitleButton title={title} onClick={handleBack} />
            ) : (
              <span className='flex-1 truncate min-is-0 pis-6'>{title}</span>
            )}
            {alternateTree && !isAlternate && (
              <IconButton
                variant='ghost'
                classNames={['shrink-0', hoverableControlItem, hoverableOpenControlItem, 'pli-2 pointer-fine:pli-1']}
                iconOnly
                size={5}
                icon={alternateTree.properties.icon ?? 'ph--placeholder--regular'}
                label={toLocalizedString(alternateTree.properties.label ?? alternateTree.id, t)}
                data-testid='treeView.alternateTreeButton'
                onClick={handleOpen}
              />
            )}
            <NavTreeItemColumns path={path} item={item} open density='coarse' />
          </h2>
          <div role='none' className='overflow-y-auto'>
            {isAlternate ? (
              <Tree
                {...navTreeContext}
                useItems={useAlternateItems}
                id={alternateTree.id}
                root={alternateTree}
                path={alternatePath}
                levelOffset={5}
                gridTemplateColumns='[tree-row-start] 1fr min-content min-content min-content [tree-row-end]'
                renderColumns={NavTreeItemColumns}
              />
            ) : (
              <Tree
                {...navTreeContext}
                id={item.id}
                root={item}
                path={path}
                levelOffset={5}
                draggable
                gridTemplateColumns='[tree-row-start] 1fr min-content min-content min-content [tree-row-end]'
                renderColumns={NavTreeItemColumns}
              />
            )}
          </div>
        </>
      )}
    </Tabs.Tabpanel>
  );
};

const L1PanelCollection = ({ item, path, ...props }: L1PanelProps) => {
  const { useItems } = useNavTreeContext();
  useLoadDescendents(item);
  const collectionItems = useItems(item);
  const groupPath = useMemo(() => [...path, item.id], [item.id, path]);
  return (
    <>
      {collectionItems
        .filter((item) => l0ItemType(item) === 'tab')
        .map((item) => (
          <L1Panel key={item.id} item={item} path={groupPath} {...props} />
        ))}
    </>
  );
};

export type L1PanelsProps = Pick<L1PanelProps, 'open' | 'currentItemId' | 'onBack'> & {
  topLevelItems: Node<any>[];
  path: string[];
};

export const L1Panels = ({ topLevelItems, onBack, ...props }: L1PanelsProps) => {
  return (
    <>
      {topLevelItems.map((item) => {
        const type = l0ItemType(item);
        switch (type) {
          case 'collection':
            return <L1PanelCollection key={item.id} item={item} {...props} />;
          case 'tab':
            return <L1Panel key={item.id} item={item} {...props} onBack={onBack} />;
          default:
            return null;
        }
      })}
    </>
  );
};
