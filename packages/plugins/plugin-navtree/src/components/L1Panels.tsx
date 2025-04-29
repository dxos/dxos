//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import { useLayout } from '@dxos/app-framework';
import { type Node } from '@dxos/app-graph';
import { Button, Icon, IconButton, toLocalizedString, useTranslation } from '@dxos/react-ui';
import { Tree } from '@dxos/react-ui-list';
import { Tabs } from '@dxos/react-ui-tabs';
import { hoverableControlItem, hoverableOpenControlItem, mx } from '@dxos/react-ui-theme';

import { useNavTreeContext } from './NavTreeContext';
import { NavTreeItemColumns } from './NavTreeItemColumns';
import { useLoadDescendents } from '../hooks';
import { NAVTREE_PLUGIN } from '../meta';
import { l0ItemType } from '../util';

export type L1PanelProps = {
  item: Node<any>;
  path: string[];
  currentItemId: string;
  onBack?: () => void;
};

const L1Panel = ({ item, path, currentItemId, onBack }: L1PanelProps) => {
  const layout = useLayout();
  const { isAlternateTree, setAlternateTree, ...navTreeContext } = useNavTreeContext();
  const { t } = useTranslation(NAVTREE_PLUGIN);

  // TODO(wittjosiah): Support multiple alternate trees.
  const alternateTree = navTreeContext.getItems(item, 'alternate-tree')[0];
  const alternatePath = useMemo(() => [...path, item.id], [item.id, path]);
  const handleOpen = useCallback(() => setAlternateTree?.(alternatePath, true), [alternatePath, setAlternateTree]);
  const isAlternate = isAlternateTree?.(alternatePath, item) ?? false;

  const handleBack = useCallback(() => {
    if (isAlternate) {
      setAlternateTree?.(alternatePath, false);
    } else {
      onBack?.();
    }
  }, [isAlternate, onBack, alternatePath, setAlternateTree]);

  return (
    <Tabs.Tabpanel
      key={item.id}
      value={item.id}
      classNames={[
        'absolute inset-block-0 inline-end-0 is-[calc(100%-var(--l0-size))] lg:is-[--l1-size] grid-cols-1 grid-rows-[var(--rail-size)_1fr] pbs-[env(safe-area-inset-top)]',
        item.id === currentItemId && 'grid',
      ]}
      tabIndex={-1}
      {...(!layout.sidebarOpen && { inert: 'true' })}
    >
      {item.id === currentItemId && (
        <>
          <h2 className='flex items-center border-be border-separator app-drag'>
            <Button
              variant='ghost'
              density='fine'
              classNames={mx(
                'is-6 pli-0 dx-focus-ring-inset',
                !item.id.startsWith('!') && !isAlternate && 'invisible',
                hoverableControlItem,
                hoverableOpenControlItem,
              )}
              onClick={handleBack}
            >
              <Icon icon='ph--caret-left--regular' size={3} />
            </Button>
            <span className='flex-1 truncate cursor-default'>{toLocalizedString(item.properties.label, t)}</span>
            {alternateTree && !isAlternate && (
              <IconButton
                variant='ghost'
                classNames={mx('shrink-0', hoverableControlItem, hoverableOpenControlItem, 'pli-2 pointer-fine:pli-1')}
                iconOnly
                icon={alternateTree.properties.icon ?? 'ph--placeholder--regular'}
                label={toLocalizedString(alternateTree.properties.label ?? alternateTree.id, t)}
                data-testid='treeView.alternateTreeButton'
                onClick={handleOpen}
              />
            )}
            <NavTreeItemColumns path={path} item={item} open />
          </h2>
          <div role='none' className='overflow-y-auto'>
            {isAlternate ? (
              <Tree
                {...navTreeContext}
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

const L1PanelCollection = ({ item, path, currentItemId }: L1PanelProps) => {
  const { getItems } = useNavTreeContext();
  useLoadDescendents(item);
  const collectionItems = getItems(item);
  const groupPath = useMemo(() => [...path, item.id], [item.id, path]);
  return (
    <>
      {collectionItems
        .filter((item) => l0ItemType(item) === 'tab')
        .map((item) => (
          <L1Panel key={item.id} item={item} path={groupPath} currentItemId={currentItemId} />
        ))}
    </>
  );
};

export const L1Panels = ({
  topLevelItems,
  path,
  currentItemId,
  onBack,
}: Pick<L1PanelProps, 'onBack'> & {
  topLevelItems: Node<any>[];
  path: string[];
  currentItemId: string;
}) => {
  return (
    <>
      {topLevelItems.map((item) => {
        const type = l0ItemType(item);
        switch (type) {
          case 'collection':
            return <L1PanelCollection key={item.id} item={item} path={path} currentItemId={currentItemId} />;
          case 'tab':
            return <L1Panel key={item.id} item={item} path={path} currentItemId={currentItemId} onBack={onBack} />;
          default:
            return null;
        }
      })}
    </>
  );
};
