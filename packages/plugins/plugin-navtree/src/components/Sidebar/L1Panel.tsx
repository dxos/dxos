//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import { type Node } from '@dxos/app-graph';
import { IconButton, toLocalizedString, Toolbar, useTranslation } from '@dxos/react-ui';
import { Tree } from '@dxos/react-ui-list';
import { Tabs } from '@dxos/react-ui-tabs';
import { hoverableControlItem, hoverableOpenControlItem } from '@dxos/react-ui-theme';

import { useLoadDescendents } from '../../hooks';
import { NAVTREE_PLUGIN } from '../../meta';
import { l0ItemType } from '../../util';
import { useNavTreeContext } from '../NavTreeContext';
import { NavTreeItemColumns } from '../NavTreeItem';

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
  const isAlternate = isAlternateTree?.(alternatePath, item) ?? false;
  const useAlternateItems = useCallback(
    (node?: Node, { disposition }: { disposition?: string } = {}) => {
      // TODO(wittjosiah): Sorting is expensive, limit to necessary items for now.
      return navTreeContext.useItems(node, { disposition, sort: node?.id === alternateTree.id });
    },
    [navTreeContext, alternateTree],
  );

  const handleOpen = useCallback(() => {
    setAlternateTree?.(alternatePath, true);
  }, [alternatePath, setAlternateTree]);

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
          <Toolbar.Root classNames='!p-0 border-be border-subduedSeparator app-drag density-coarse'>
            <h2 className='flex-1 truncate min-is-0 pis-4'>{title}</h2>
            <div className='pis-2 pie-2'>
              {(backCapable && (
                <IconButton
                  variant='ghost'
                  icon='ph--arrow-u-down-left--regular'
                  iconOnly
                  size={5}
                  label={t('button back')}
                  classNames={[hoverableControlItem, hoverableOpenControlItem, 'pointer-fine:pli-1']}
                  onClick={handleBack}
                />
              )) ||
                (alternateTree && !isAlternate && (
                  <IconButton
                    data-testid='treeView.alternateTreeButton'
                    variant='ghost'
                    icon={alternateTree.properties.icon ?? 'ph--placeholder--regular'}
                    iconOnly
                    size={5}
                    label={toLocalizedString(alternateTree.properties.label ?? alternateTree.id, t)}
                    classNames={[hoverableControlItem, hoverableOpenControlItem, 'pointer-fine:pli-1']}
                    onClick={handleOpen}
                  />
                ))}
            </div>
            {/* TODO(burdon): What is this? */}
            {/* <NavTreeItemColumns path={path} item={item} open density='coarse' /> */}
          </Toolbar.Root>

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
