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

export const DEFAULT_TYPE = 'stack-section';

type StackItem = MosaicDataItem & {
  items: StackSectionItem[];
};

export type StackSectionItem = MosaicDataItem & {
  object: StackSectionContent;
};

export type StackSectionContent = MosaicDataItem & { title?: string };

export type StackProps<TData extends StackSectionContent = StackSectionContent> = Omit<
  MosaicContainerProps<TData, number>,
  'debug' | 'Component'
> & {
  SectionContent: FC<{ data: TData }>;
  items?: StackSectionItem[];
  transform?: (item: MosaicDataItem, type?: string) => StackSectionItem;
  onRemoveSection?: (path: string) => void;
  onNavigateToSection?: (id: string) => void;
};

export const Stack = ({
  id,
  type = DEFAULT_TYPE,
  className,
  SectionContent,
  items = [],
  transform,
  onOver,
  onDrop,
  onRemoveSection,
  onNavigateToSection,
}: StackProps) => {
  const { ref: containerRef, width = 0 } = useResizeDetector({ refreshRate: 200 });
  const { operation, activeItem, overItem } = useMosaic();
  const itemsWithPreview = useItemsWithPreview({ path: id, items });

  const Component: MosaicTileComponent<StackSectionItem, HTMLLIElement> = useMemo(
    () =>
      forwardRef(({ path, type, active, draggableStyle, draggableProps, item }, forwardRef) => {
        const { t } = useTranslation(translationKey);
        const transformedItem = transform ? transform(item, active ? activeItem?.type : type) : item;
        const section = (
          <Section
            ref={forwardRef}
            id={transformedItem.id}
            title={transformedItem.object.title ?? t('untitled section title')}
            active={active}
            draggableProps={draggableProps}
            draggableStyle={draggableStyle}
            onRemove={() => onRemoveSection?.(path)}
            onNavigate={() => onNavigateToSection?.(transformedItem.id)}
          >
            <SectionContent data={transformedItem.object} />
          </Section>
        );

        return active === 'overlay' ? <List>{section}</List> : section;
      }),
    [id, SectionContent, transform, activeItem],
  );

  // TODO(burdon): Create context provider to relay inner section width.
  const getOverlayStyle = useCallback(() => ({ width: Math.min(width, 59 * 16) }), [width]);

  return (
    <div ref={containerRef}>
      <Mosaic.Container {...{ id, type, Component, getOverlayStyle, onOver, onDrop }}>
        <Mosaic.DroppableTile
          path={id}
          type={type}
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
    const { Component, type } = useContainer();

    // NOTE: Keep outer padding the same as MarkdownMain.
    return (
      <List ref={forwardedRef} classNames={mx(className, textBlockWidth, 'm-1 p-2', isOver && dropRing)}>
        {items.length > 0 ? (
          <Mosaic.SortableContext items={items} direction='vertical'>
            {items.map((item, index) => (
              <Mosaic.SortableTile
                key={item.id}
                item={item}
                path={path}
                type={type}
                position={index}
                Component={Component!}
              />
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
