//
// Copyright 2024 DXOS.org
//

import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
import { draggable, dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { setCustomNativeDragPreview } from '@atlaskit/pragmatic-drag-and-drop/element/set-custom-native-drag-preview';
import { attachClosestEdge, extractClosestEdge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge';
import React, { memo, useCallback, useEffect, useRef, useState } from 'react';

import { invariant } from '@dxos/invariant';
import { Button, Icon, Treegrid, useDefaultValue } from '@dxos/react-ui';

import { DropIndicator } from './DropIndicator';
import { paddingIndendation } from './helpers';
import { type ItemState, type ItemType } from './types';

export type TreeItemProps = {
  item: ItemType;
  open: boolean;
  current: boolean;
  draggable: boolean;
  onOpenChange?: (id: string, nextOpen: boolean) => void;
  onSelect?: (id: string, nextState: boolean) => void;
};

// TODO(wittjosiah): Styles.
// TODO(wittjosiah): Port data, aria, keynav, etc. props over from navtree.

export const TreeItem = memo(
  ({ item, open, current, draggable: _draggable, onOpenChange, onSelect }: TreeItemProps) => {
    const { id, name, icon, path } = item;
    const parentOf = useDefaultValue(item.parentOf, () => []);
    const level = path.length - 1;
    const isBranch = parentOf.length > 0;

    const ref = useRef<HTMLDivElement | null>(null);
    const dragHandleRef = useRef<HTMLButtonElement | null>(null);
    const [state, setState] = useState<ItemState>({ type: 'idle' });

    useEffect(() => {
      if (!_draggable) {
        return;
      }

      const element = ref.current;
      invariant(element);

      // https://atlassian.design/components/pragmatic-drag-and-drop/core-package/adapters/element/about
      return combine(
        draggable({
          element,
          dragHandle: dragHandleRef.current!,
          getInitialData: () => item,
          onGenerateDragPreview: ({ nativeSetDragImage, source }) => {
            const rect = source.element.getBoundingClientRect();
            setCustomNativeDragPreview({
              nativeSetDragImage,
              getOffset: ({ container }) => {
                const { height } = container.getBoundingClientRect();
                return {
                  x: 20,
                  y: height / 2,
                };
              },
              render: ({ container }) => {
                container.style.width = rect.width + 'px';
                setState({ type: 'preview', container });
              },
            });
          },
          onDragStart: () => {
            setState({ type: 'is-dragging' });
          },
          onDrop: () => {
            setState({ type: 'idle' });
          },
        }),
        dropTargetForElements({
          element,
          canDrop: ({ source }) => {
            return source.element !== element; // && isItem(source.data);
          },
          getData: ({ input }) => {
            return attachClosestEdge(item, { element, input, allowedEdges: ['top', 'bottom'] });
          },
          getIsSticky: () => true,
          onDragEnter: ({ self }) => {
            const closestEdge = extractClosestEdge(self.data);
            setState({ type: 'is-dragging-over', closestEdge });
          },
          onDrag: ({ self }) => {
            const closestEdge = extractClosestEdge(self.data);
            setState((current) => {
              if (current.type === 'is-dragging-over' && current.closestEdge === closestEdge) {
                return current;
              }
              return { type: 'is-dragging-over', closestEdge };
            });
          },
          onDragLeave: () => {
            setState({ type: 'idle' });
          },
          onDrop: () => {
            setState({ type: 'idle' });
          },
        }),
      );
    }, [draggable, item]);

    const handleOpenChange = useCallback(() => onOpenChange?.(id, !open), [onOpenChange, id, open]);
    const handleSelect = useCallback(() => onSelect?.(id, !current), [onSelect, id, current]);

    return (
      <Treegrid.Row
        ref={ref}
        key={id}
        id={path.join(Treegrid.PATH_SEPARATOR)}
        aria-labelledby={`${id}__label`}
        parentOf={isBranch ? parentOf.join(Treegrid.PARENT_OF_SEPARATOR) : undefined}
        classNames='relative grid aria-[current]:bg-input'
        // NOTE(thure): This is intentionally an empty string to for descendents to select by in the CSS
        //   without alerting the user (except for in the correct link element). See also:
        //   https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Attributes/aria-current#description
        aria-current={current ? ('' as 'page') : undefined}
      >
        <Treegrid.Cell indent classNames='flex items-center' style={paddingIndendation(level)}>
          <Button
            variant='ghost'
            density='fine'
            classNames={['!pli-1', !isBranch && 'invisible']}
            onClick={handleOpenChange}
          >
            <Icon
              icon='ph--caret-right--regular'
              size={3}
              classNames={['transition duration-200', open && 'rotate-90']}
            />
          </Button>
          <Button
            ref={dragHandleRef}
            variant='ghost'
            density='fine'
            classNames='grow gap-1 !pis-0.5 hover:!bg-transparent dark:hover:!bg-transparent'
            onClick={handleSelect}
          >
            {icon && <Icon icon={icon ?? 'ph--placeholder--regular'} size={5} classNames='is-[1em] bs-[1em] mlb-1' />}
            <span className='flex-1 is-0 truncate text-start'>{name}</span>
          </Button>
        </Treegrid.Cell>
        {state.type === 'is-dragging-over' && state.closestEdge && (
          <DropIndicator edge={state.closestEdge} level={level} />
        )}
      </Treegrid.Row>
    );
  },
);
