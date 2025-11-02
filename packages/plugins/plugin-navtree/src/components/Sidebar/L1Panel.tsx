//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import { type Node } from '@dxos/app-graph';
import { DensityProvider, IconButton, toLocalizedString, useTranslation } from '@dxos/react-ui';
import { Tree } from '@dxos/react-ui-list';
import { Tabs } from '@dxos/react-ui-tabs';
import { hoverableControlItem, hoverableOpenControlItem } from '@dxos/react-ui-theme';

import { meta } from '../../meta';
import { useNavTreeContext } from '../NavTreeContext';
import { NavTreeItemColumns } from '../NavTreeItem';

export type L1PanelProps = {
  open?: boolean;
  path: string[];
  item: Node<any>;
  currentItemId: string;
  onBack?: () => void;
};

/**
 * Space or settings panel.
 */
export const L1Panel = ({ open, path, item, currentItemId, onBack }: L1PanelProps) => {
  const { t } = useTranslation(meta.id);
  const { isAlternateTree, ...navTreeContext } = useNavTreeContext();
  const title = toLocalizedString(item.properties.label, t);

  // TODO(wittjosiah): Support multiple alternate trees.
  const { useItems } = navTreeContext;
  const alternateTree = useItems(item, { disposition: 'alternate-tree' })[0];
  const alternatePath = useMemo(() => [...path, item.id], [item.id, path]);
  const isAlternate = isAlternateTree?.(alternatePath, item) ?? false;
  const useAlternateItems = useCallback(
    (node?: Node, { disposition }: { disposition?: string } = {}) => {
      // TODO(wittjosiah): Sorting is expensive, limit to necessary items for now.
      return useItems(node, { disposition, sort: node?.id === alternateTree.id });
    },
    [alternateTree, useItems],
  );

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
      {...(!open && { inert: true })}
    >
      {item.id === currentItemId && (
        <DensityProvider density='fine'>
          <L1PanelHeader path={path} item={item} currentItemId={currentItemId} onBack={onBack} />
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
                useItems={useAlternateItems}
              />
            ) : (
              <Tree
                {...navTreeContext}
                id={item.id}
                root={item}
                path={path}
                levelOffset={5}
                gridTemplateColumns='[tree-row-start] 1fr min-content min-content min-content [tree-row-end]'
                renderColumns={NavTreeItemColumns}
                draggable
              />
            )}
          </div>
        </DensityProvider>
      )}
    </Tabs.Tabpanel>
  );
};

/**
 * Header row.
 */
const L1PanelHeader = ({ item, path, onBack }: L1PanelProps) => {
  const { t } = useTranslation(meta.id);
  const { isAlternateTree, setAlternateTree, ...navTreeContext } = useNavTreeContext();
  const title = toLocalizedString(item.properties.label, t);

  // TODO(wittjosiah): Support multiple alternate trees.
  const alternateTree = navTreeContext.useItems(item, { disposition: 'alternate-tree' })[0];
  const alternatePath = useMemo(() => [...path, item.id], [item.id, path]);
  const isAlternate = isAlternateTree?.(alternatePath, item) ?? false;
  const backCapable = item.id.startsWith('!') || isAlternate;

  const handleOpen = useCallback(() => {
    setAlternateTree?.(alternatePath, true);
  }, [alternatePath, setAlternateTree]);

  const handleBack = useCallback(() => {
    if (isAlternate) {
      setAlternateTree?.(alternatePath, false);
    } else {
      onBack?.();
    }
  }, [isAlternate, alternatePath, setAlternateTree, onBack]);

  // TODO(burdon): Reuse same grid as tree?
  return (
    <div className='flex is-full items-center border-be border-subduedSeparator app-drag density-coarse'>
      <div className='is-6' />
      <h2 className='flex-1 truncate min-is-0'>{title}</h2>
      {(backCapable && (
        <IconButton
          variant='ghost'
          icon='ph--arrow-u-down-left--regular'
          iconOnly
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
            label={toLocalizedString(alternateTree.properties.label ?? alternateTree.id, t)}
            classNames={[hoverableControlItem, hoverableOpenControlItem, 'pointer-fine:pli-1']}
            onClick={handleOpen}
          />
        ))}
      <NavTreeItemColumns open path={path} item={item} density='coarse' />
    </div>
  );
};
