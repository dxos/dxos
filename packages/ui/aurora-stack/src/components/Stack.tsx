//
// Copyright 2023 DXOS.org
//

import React, { FC, forwardRef, useMemo } from 'react';

import { List } from '@dxos/aurora';
import {
  Mosaic,
  MosaicContainerProps,
  MosaicDataItem,
  MosaicTileComponent,
  useItemsWithPreview,
} from '@dxos/aurora-grid/next';

import { Section } from './Section';

export type Direction = 'horizontal' | 'vertical';

export type StackSectionItem = MosaicDataItem & {
  title: string;
};

export type StackProps<TData extends StackSectionItem = StackSectionItem> = Omit<
  MosaicContainerProps<TData, number>,
  'debug' | 'Component'
> & {
  Component?: FC<{ data: TData }>;
  items?: TData[];
  direction?: Direction;
  onRemoveSection?: (id: string) => void;
};

// TODO(burdon): Make generic (and forwardRef).
export const Stack = <TData extends StackSectionItem = StackSectionItem>({
  id,
  Component: SectionContent = ({ data }) => <pre>{JSON.stringify(data)}</pre>,
  onOver,
  onDrop,
  items = [],
  onRemoveSection,
}: StackProps<TData>) => {
  const itemsWithPreview = useItemsWithPreview({ path: id, items });

  const Component: MosaicTileComponent<TData, HTMLLIElement> = useMemo(
    () =>
      forwardRef(({ active, draggableStyle, draggableProps, item }, forwardRef) => {
        const section = (
          <Section
            ref={forwardRef}
            id={item.id}
            title={item.title}
            active={active}
            draggableProps={draggableProps}
            draggableStyle={draggableStyle}
            onRemove={() => onRemoveSection?.(id)}
          >
            <SectionContent data={item} />
          </Section>
        );

        return active === 'overlay' ? <List>{section}</List> : section;
      }),
    [SectionContent],
  );

  return (
    <Mosaic.Container {...{ id, Component, onOver, onDrop }}>
      <List>
        <Mosaic.SortableContext items={itemsWithPreview} direction='vertical'>
          {itemsWithPreview.map((item, index) => (
            <Mosaic.SortableTile key={item.id} item={item} path={id} position={index} Component={Component} />
          ))}
        </Mosaic.SortableContext>
      </List>
    </Mosaic.Container>
  );
};
