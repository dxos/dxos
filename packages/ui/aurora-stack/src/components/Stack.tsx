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
import { mx } from '@dxos/aurora-theme';

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
  direction = 'vertical',
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
        <Mosaic.SortableContext items={itemsWithPreview} direction={direction}>
          <div className={mx('flex overflow-hidden', direction === 'vertical' && 'w-[300px]')}>
            <div
              className={mx(
                'flex flex-col w-full my-1',
                direction === 'vertical' ? 'overflow-y-auto' : 'overflow-x-auto',
              )}
            >
              <div className={mx('flex', direction === 'vertical' && 'flex-col')}>
                {itemsWithPreview.map((item, index) => (
                  <Mosaic.SortableTile key={item.id} item={item} path={id} position={index} Component={Component} />
                ))}
              </div>
            </div>
          </div>
        </Mosaic.SortableContext>
      </List>
    </Mosaic.Container>
  );
};
