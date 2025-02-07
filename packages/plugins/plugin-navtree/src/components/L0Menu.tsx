//
// Copyright 2025 DXOS.org
//

import { DismissableLayer } from '@radix-ui/react-dismissable-layer';
import React, { type MouseEvent, useCallback, useMemo, useRef, useState } from 'react';

import { Surface } from '@dxos/app-framework';
import { type Node } from '@dxos/app-graph';
import { Icon, toLocalizedString, useTranslation } from '@dxos/react-ui';
import { Tabs } from '@dxos/react-ui-tabs';

import { useNavTreeContext } from './NavTreeContext';
import { useLoadDescendents } from '../hooks';
import { NAVTREE_PLUGIN } from '../meta';
import { getFirstTwoRenderableChars, l0ItemType } from '../util';

type L0ItemProps = {
  item: Node<any>;
  parent?: Node<any>;
  path: string[];
};

const useL0ItemClick = ({ item, parent, path }: L0ItemProps, type: string) => {
  const { onSelect, isCurrent } = useNavTreeContext();
  return useCallback(
    (event: MouseEvent) => {
      switch (type) {
        case 'link':
          return onSelect?.({ item, path, current: !isCurrent(path, item), option: event.altKey });
        case 'action': {
          const {
            data: invoke,
            properties: { caller },
          } = item;
          return invoke?.(caller ? { node: parent, caller } : { node: parent });
        }
      }
    },
    [item, type, onSelect, isCurrent, parent],
  );
};

const L0Item = ({ item, parent, path }: L0ItemProps) => {
  const { t } = useTranslation(NAVTREE_PLUGIN);
  const type = l0ItemType(item);
  const itemPath = useMemo(() => [...path, item.id], [item.id, path]);
  const { getProps } = useNavTreeContext();
  const { id, testId } = getProps?.(item, path) ?? {};
  const Root = type === 'collection' ? 'h2' : type === 'tab' ? Tabs.TabPrimitive : 'button';
  const handleClick = useL0ItemClick({ item, path: itemPath, parent }, type);
  const rootProps =
    type === 'tab'
      ? { value: item.id, tabIndex: 0, 'data-testid': testId, 'data-itemid': id }
      : type !== 'collection'
        ? { onClick: handleClick, 'data-testid': testId, 'data-itemid': id }
        : { onClick: handleClick };
  const localizedString = toLocalizedString(item.properties.label, t);
  const avatarValue = useMemo(
    () => (type === 'tab' ? getFirstTwoRenderableChars(localizedString).join('') : []),
    [type, item.properties.label, t],
  );
  return (
    <Root
      {...(rootProps as any)}
      data-type={type}
      className='group/l0i ch-focus-ring-group grid grid-cols-subgrid col-span-2 overflow-hidden relative data[type!="collection"]:cursor-pointer'
    >
      {type !== 'collection' && (
        <div
          role='none'
          className='absolute -z-[1] inset-inline-2 inset-block-1 bg-input rounded group-hover/l0i:bg-input ch-focus-ring-group-indicator transition-colors'
        />
      )}
      <div
        role='none'
        className='hidden group-aria-selected/l0i:block absolute inline-start-0 inset-block-4 is-1 bg-accentSurface rounded-ie'
      />
      {type === 'tab' ? (
        <span className='place-self-center text-3xl font-light'>{avatarValue}</span>
      ) : (
        item.properties.icon && <Icon icon={item.properties.icon} size={7} classNames='place-self-center' />
      )}
      <span id={`${item.id}__label`} className='is-[--l01-size] text-start' style={{ alignSelf: 'center' }}>
        {localizedString}
      </span>
    </Root>
  );
};

const L0Collection = ({ item, path, parent }: L0ItemProps) => {
  const navTreeContext = useNavTreeContext();
  useLoadDescendents(item);
  const collectionItems = navTreeContext.getItems(item);
  const groupPath = useMemo(() => [...path, item.id], [item.id, path]);
  const { id, testId } = navTreeContext.getProps?.(item, path) ?? {};
  return (
    <div
      role='group'
      className='contents group/l0c'
      aria-labelledby={`${item.id}__label`}
      data-itemid={id}
      data-testid={testId}
    >
      <L0Item item={item} parent={parent} path={groupPath} />
      {collectionItems.map((collectionItem) => (
        <L0Item key={collectionItem.id} item={collectionItem} parent={item} path={groupPath} />
      ))}
    </div>
  );
};

const delayDuration = 1200;

const bannerVariant = { variant: 'l0' };

export const L0Menu = ({
  topLevelItems,
  parent,
  path,
}: {
  topLevelItems: Node<any>[];
  parent?: Node<any>;
  path: string[];
}) => {
  const [expanded, setExpanded] = useState(false);
  const expandTimerRef = useRef(0);
  const handleDelayedExpand = useCallback(() => {
    window.clearTimeout(expandTimerRef.current);
    expandTimerRef.current = window.setTimeout(() => {
      setExpanded(true);
      expandTimerRef.current = 0;
    }, delayDuration);
  }, []);
  const handleExpand = useCallback(() => {
    window.clearTimeout(expandTimerRef.current);
    expandTimerRef.current = 0;
    setExpanded(true);
  }, []);
  const handleClose = useCallback(() => {
    window.clearTimeout(expandTimerRef.current);
    expandTimerRef.current = 0;
    setExpanded(false);
  }, []);
  const handleFocus = useCallback(() => {
    if (document.body.getAttribute('data-is-keyboard') === 'true') {
      handleExpand();
    } else {
      handleDelayedExpand();
    }
  }, []);
  return (
    <DismissableLayer
      onDismiss={handleClose}
      onPointerEnter={handleDelayedExpand}
      onPointerLeave={handleClose}
      onFocus={handleFocus}
      data-state={expanded ? 'expanded' : 'collapsed'}
      className='group/l0 absolute inset-block-0 inline-start-0 grid grid-cols-[var(--l0-size)_0] grid-rows-[1fr_min-content] contain-layout !is-[--l0-size] data-[state=expanded]:!is-[--l1-size] data-[state=expanded]:grid-cols-[var(--l0-size)_calc(var(--l1-size)-var(--l0-size))] transition-[inline-size,grid-template-columns] duration-200 ease-in-out bg-l0 backdrop-blur border-ie border-separator'
    >
      <Tabs.Tablist classNames='grid grid-cols-subgrid col-span-2 auto-rows-[calc(var(--l0-size)-.5rem)] overflow-y-auto plb-1'>
        {topLevelItems.map((item) => {
          if (l0ItemType(item) === 'collection') {
            return <L0Collection key={item.id} item={item} parent={parent} path={path} />;
          } else {
            return <L0Item key={item.id} item={item} parent={parent} path={path} />;
          }
        })}
      </Tabs.Tablist>
      <Surface role='banner' data={bannerVariant} />
    </DismissableLayer>
  );
};
