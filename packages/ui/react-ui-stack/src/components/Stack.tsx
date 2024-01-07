//
// Copyright 2023 DXOS.org
//

import { useArrowNavigationGroup } from '@fluentui/react-tabster';
import React, { forwardRef, useCallback } from 'react';
import { useResizeDetector } from 'react-resize-detector';

import { List, useTranslation } from '@dxos/react-ui';
import {
  type MosaicContainerProps,
  type MosaicTileComponent,
  Mosaic,
  Path,
  useContainer,
  useItemsWithPreview,
  useMosaic,
} from '@dxos/react-ui-mosaic';
import { dropRing, mx, textBlockWidth } from '@dxos/react-ui-theme';

import {
  SectionTile,
  type StackContextValue,
  type StackItem,
  type StackSectionContent,
  type StackSectionItem,
} from './Section';
import { translationKey } from '../translations';

export type Direction = 'horizontal' | 'vertical';

export const DEFAULT_TYPE = 'stack-section';

export type StackProps<TData extends StackSectionContent = StackSectionContent> = Omit<
  MosaicContainerProps<TData, number>,
  'debug' | 'Component'
> &
  StackContextValue<TData> & {
    items?: StackSectionItem[];
    separation?: boolean; // TODO(burdon): Style.
  };

export const Stack = ({
  id,
  type = DEFAULT_TYPE,
  classNames,
  SectionContent,
  items = [],
  separation = true,
  transform,
  onOver,
  onDrop,
  onRemoveSection,
  onNavigateToSection,
  ...props
}: StackProps) => {
  const { ref: containerRef, width = 0 } = useResizeDetector<HTMLDivElement>({ refreshRate: 200 });
  const { operation, overItem } = useMosaic();
  const itemsWithPreview = useItemsWithPreview({ path: id, items });

  // TODO(burdon): Why callback not useMemo?
  const getOverlayStyle = useCallback(() => ({ width: Math.min(width, 59 * 16) }), [width]);

  const getOverlayProps = useCallback(() => ({ itemContext: { SectionContent } }), [SectionContent]);

  // TODO(thure): The root cause of the discrepancy between `activeNodeRect.top` and `overlayNodeRect.top` in Composer
  //  in particular is not yet known, so this solution may may backfire in unforeseeable cases.
  const stackModifier = useCallback<Exclude<MosaicContainerProps['modifier'], undefined>>(
    (_activeItem, { transform, activeNodeRect, overlayNodeRect }) => {
      if (activeNodeRect && overlayNodeRect) {
        transform.y += activeNodeRect?.top - overlayNodeRect?.top;
      }
      return transform;
    },
    [],
  );

  return (
    <div ref={containerRef} {...props}>
      <Mosaic.Container
        {...{
          id,
          type,
          Component: SectionTile,
          getOverlayStyle,
          getOverlayProps,
          onOver,
          onDrop,
          modifier: stackModifier,
        }}
      >
        <Mosaic.DroppableTile
          path={id}
          type={type}
          classNames={classNames}
          item={{ id, items: itemsWithPreview }}
          itemContext={{ separation, transform, onRemoveSection, onNavigateToSection, SectionContent }}
          isOver={overItem && Path.hasRoot(overItem.path, id) && (operation === 'copy' || operation === 'transfer')}
          Component={StackTile}
        />
      </Mosaic.Container>
    </div>
  );
};

const StackTile: MosaicTileComponent<StackItem, HTMLOListElement> = forwardRef(
  ({ classNames, path, isOver, item: { items }, itemContext }, forwardedRef) => {
    const { t } = useTranslation(translationKey);
    const { Component, type } = useContainer();
    const domAttributes = useArrowNavigationGroup({ axis: 'grid' });

    // NOTE: Keep outer padding the same as MarkdownMain.
    return (
      <List
        ref={forwardedRef}
        classNames={mx(textBlockWidth, 'm-2 p-2 rounded-lg', isOver && dropRing, classNames)}
        {...domAttributes}
      >
        {items.length > 0 ? (
          <Mosaic.SortableContext items={items} direction='vertical'>
            {items.map((item, index) => (
              <Mosaic.SortableTile
                key={item.id}
                item={item}
                itemContext={itemContext}
                path={path}
                type={type}
                position={index}
                Component={Component!}
              />
            ))}
          </Mosaic.SortableContext>
        ) : (
          <p
            className='text-center m-1 p-4 border border-dashed border-neutral-500/50 rounded'
            data-testid='stack.empty'
          >
            {t('empty stack message')}
          </p>
        )}
      </List>
    );
  },
);
