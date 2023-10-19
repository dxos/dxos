//
// Copyright 2023 DXOS.org
//

import React, { type FC, forwardRef, useMemo } from 'react';

import { List, useTranslation } from '@dxos/react-ui';
import {
  Mosaic,
  type MosaicContainerProps,
  type MosaicDataItem,
  type MosaicTileComponent,
  Path,
  useContainer,
  useItemsWithPreview,
  useMosaic,
} from '@dxos/react-ui-mosaic';
import { dropRing, mx, textBlockWidth } from '@dxos/react-ui-theme';

import { Section } from './Section';
import { STACK } from '../translations';

export type Direction = 'horizontal' | 'vertical';

type StackItem = MosaicDataItem & {
  items: StackSectionItem[];
};

export type StackSectionItem = MosaicDataItem & {
  title: string;
};

export type StackProps<TData extends StackSectionItem = StackSectionItem> = Omit<
  MosaicContainerProps<TData, number>,
  'debug' | 'Component'
> & {
  Component: FC<{ data: TData }>;
  items?: TData[];
  onRemoveSection?: (path: string) => void;
};

export const Stack = ({
  id,
  className,
  Component: SectionContent,
  items = [],
  onOver,
  onDrop,
  onRemoveSection,
}: StackProps) => {
  const { operation, overItem } = useMosaic();
  const itemsWithPreview = useItemsWithPreview({ path: id, items });

  const Component: MosaicTileComponent<StackSectionItem, HTMLLIElement> = useMemo(
    () =>
      forwardRef(({ path, active, draggableStyle, draggableProps, item }, forwardRef) => {
        const section = (
          <Section
            ref={forwardRef}
            id={item.id}
            title={item.title}
            active={active}
            draggableProps={draggableProps}
            draggableStyle={draggableStyle}
            onRemove={() => onRemoveSection?.(path)}
          >
            <SectionContent data={item} />
          </Section>
        );

        return active === 'overlay' ? <List>{section}</List> : section;
      }),
    [id, SectionContent],
  );

  return (
    <Mosaic.Container {...{ id, Component, onOver, onDrop }}>
      <Mosaic.DroppableTile
        path={id}
        className={className}
        item={{ id, items: itemsWithPreview }}
        Component={StackTile}
        isOver={overItem && Path.hasRoot(overItem.path, id) && (operation === 'copy' || operation === 'adopt')}
      />
    </Mosaic.Container>
  );
};

const StackTile: MosaicTileComponent<StackItem, HTMLOListElement> = forwardRef(
  ({ className, path, isOver, item: { items } }, forwardedRef) => {
    const { t } = useTranslation(STACK);
    const { Component } = useContainer();

    return (
      <List ref={forwardedRef} classNames={mx(className, textBlockWidth, 'p-1', isOver && dropRing)}>
        {items.length > 0 ? (
          <Mosaic.SortableContext items={items} direction='vertical'>
            {items.map((item, index) => (
              <Mosaic.SortableTile key={item.id} item={item} path={path} position={index} Component={Component!} />
            ))}
          </Mosaic.SortableContext>
        ) : (
          <p className='text-center m-1 p-4 border border-dashed border-neutral-500/50 rounded'>
            {t('empty stack message')}
          </p>
        )}
      </List>
    );
  },
);
