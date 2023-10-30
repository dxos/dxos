//
// Copyright 2023 DXOS.org
//

import React, { type FC, forwardRef, useCallback, useMemo } from 'react';
import { useResizeDetector } from 'react-resize-detector';

import { List, useTranslation } from '@dxos/react-ui';
import {
  type MosaicContainerProps,
  type MosaicDataItem,
  type MosaicTileComponent,
  Mosaic,
  Path,
  useContainer,
  useItemsWithPreview,
  useMosaic,
} from '@dxos/react-ui-mosaic';
import { dropRing, mx, textBlockWidth } from '@dxos/react-ui-theme';

import { Section } from './Section';
import { translationKey } from '../translations';

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
  const { ref: containerRef, width } = useResizeDetector({ refreshRate: 200 });
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

  // TODO(burdon): Create context provider to relay inner section width.
  const getOverlayStyle = useCallback(() => ({ width: Math.min(width, 59 * 16) }), [width]);

  return (
    <div ref={containerRef}>
      <Mosaic.Container {...{ id, Component, getOverlayStyle, onOver, onDrop }}>
        <Mosaic.DroppableTile
          path={id}
          className={className}
          item={{ id, items: itemsWithPreview }}
          isOver={overItem && Path.hasRoot(overItem.path, id) && (operation === 'copy' || operation === 'transfer')}
          Component={StackTile}
        />
      </Mosaic.Container>
    </div>
  );
};

const StackTile: MosaicTileComponent<StackItem, HTMLOListElement> = forwardRef(
  ({ className, path, isOver, item: { items } }, forwardedRef) => {
    const { t } = useTranslation(translationKey);
    const { Component } = useContainer();

    // NOTE: Keep outer padding the same as MarkdownMain.
    return (
      <List ref={forwardedRef} classNames={mx(className, textBlockWidth, 'p-2', isOver && dropRing)}>
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
