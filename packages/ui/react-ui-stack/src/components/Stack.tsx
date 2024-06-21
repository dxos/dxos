//
// Copyright 2023 DXOS.org
//

import { useArrowNavigationGroup, useFocusableGroup } from '@fluentui/react-tabster';
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
import { dropRingInner, mx, textBlockWidth } from '@dxos/react-ui-theme';

import {
  type CollapsedSections,
  type AddSectionPosition,
  SectionTile,
  type StackContextValue,
  type StackItem,
  type StackSectionContent,
  type StackSectionItem,
} from './Section';
import { stackColumns } from './style-fragments';
import { translationKey } from '../translations';

export type Direction = 'horizontal' | 'vertical';

export type { CollapsedSections, AddSectionPosition };

export const DEFAULT_TYPE = 'stack-section';

export type StackProps<TData extends StackSectionContent = StackSectionContent> = Omit<
  MosaicContainerProps<TData, number>,
  'debug' | 'Component'
> &
  Omit<StackContextValue<TData>, 'setCollapsedSections'> & {
    items?: StackSectionItem[];
    separation?: boolean; // TODO(burdon): Style.
    onCollapseSection?: (id: string, collapsed: boolean) => void;
  };

export const Stack = ({
  id,
  type = DEFAULT_TYPE,
  SectionContent,
  items = [],
  separation = true,
  transform,
  onOver,
  onDrop,
  onAddSection,
  onDeleteSection,
  onNavigateToSection,
  onCollapseSection,
  ...props
}: StackProps) => {
  const { ref: containerRef, width = 0 } = useResizeDetector<HTMLDivElement>({ refreshRate: 200 });
  const { operation, overItem } = useMosaic();
  const itemsWithPreview = useItemsWithPreview({ path: id, items });

  const getOverlayStyle = useCallback(() => ({ width }), [width]);
  const getOverlayProps = useCallback(
    () => ({ itemContext: { transform, SectionContent } }),
    [transform, SectionContent],
  );

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
        item={{ id, items: itemsWithPreview }}
        // TODO(wittjosiah): Should this actually be a context?
        itemContext={{
          separation,
          transform,
          onDeleteSection,
          onNavigateToSection,
          onAddSection,
          onCollapseSection,
          SectionContent,
        }}
        isOver={overItem && Path.hasRoot(overItem.path, id) && (operation === 'copy' || operation === 'transfer')}
        Component={StackTile}
        {...props}
        ref={containerRef}
      />
    </Mosaic.Container>
  );
};

const StackTile: MosaicTileComponent<StackItem, HTMLOListElement> = forwardRef(
  ({ classNames, path, isOver, item: { items }, itemContext, type: _type, ...props }, forwardedRef) => {
    const { t } = useTranslation(translationKey);
    const { Component, type } = useContainer();
    const domAttributes = useArrowNavigationGroup({ axis: 'grid' });
    const { activeItem } = useMosaic();
    // NOTE(thure): Ensure “groupper” is available.
    const _group = useFocusableGroup();

    // NOTE: Keep outer padding the same as MarkdownMain.
    return (
      <List
        ref={forwardedRef}
        classNames={mx(
          textBlockWidth,
          'mbs-1 mbe-2 rounded-sm grid relative',
          stackColumns,
          isOver && dropRingInner,
          classNames,
        )}
        {...(!activeItem && domAttributes)}
        {...props}
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
                Component={Component}
              />
            ))}
          </Mosaic.SortableContext>
        ) : (
          <p
            className='grid col-span-2 text-center m-1 p-4 border border-dashed border-neutral-500/50 rounded'
            data-testid='stack.empty'
          >
            {t('empty stack message')}
          </p>
        )}
      </List>
    );
  },
);
