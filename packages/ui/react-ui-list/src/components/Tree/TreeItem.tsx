//
// Copyright 2024 DXOS.org
//

import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
import { draggable, dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { setCustomNativeDragPreview } from '@atlaskit/pragmatic-drag-and-drop/element/set-custom-native-drag-preview';
// https://github.com/atlassian/pragmatic-drag-and-drop/blob/main/packages/hitbox/constellation/index/about.mdx
import {
  attachInstruction,
  extractInstruction,
  type ItemMode,
  type Instruction,
} from '@atlaskit/pragmatic-drag-and-drop-hitbox/tree-item';
import React, { memo, useCallback, useEffect, useRef, useState } from 'react';

import { invariant } from '@dxos/invariant';
import { Button, Icon, Treegrid, useDefaultValue } from '@dxos/react-ui';

import { DropIndicator } from './DropIndicator';
import { DEFAULT_INDENTATION, paddingIndendation } from './helpers';
import { type ItemType } from './types';

type TreeItemState = 'idle' | 'dragging' | 'preview' | 'parent-of-instruction';

export type TreeItemProps = {
  item: ItemType;
  mode: ItemMode;
  open: boolean;
  current: boolean;
  draggable: boolean;
  canDrop?: (data: unknown) => boolean;
  onOpenChange?: (id: string, nextOpen: boolean) => void;
  onSelect?: (id: string, nextState: boolean) => void;
};

// TODO(wittjosiah): Styles.
// TODO(wittjosiah): Port data, aria, keynav, etc. props over from navtree.

export const TreeItem = memo(
  ({ item, mode, open, current, draggable: _draggable, canDrop, onOpenChange, onSelect }: TreeItemProps) => {
    const { id, name, icon, path } = item;
    const parentOf = useDefaultValue(item.parentOf, () => []);
    const level = path.length - 1;
    const isBranch = parentOf.length > 0;

    const ref = useRef<HTMLDivElement | null>(null);
    const [_state, setState] = useState<TreeItemState>('idle');
    const [instruction, setInstruction] = useState<Instruction | null>(null);

    useEffect(() => {
      if (!_draggable) {
        return;
      }

      invariant(ref.current);

      // https://atlassian.design/components/pragmatic-drag-and-drop/core-package/adapters/element/about
      return combine(
        draggable({
          element: ref.current,
          getInitialData: () => item,
          // TODO(wittjosiah): This doesn't seem to be working.
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
                setState('preview');
              },
            });
          },
          onDragStart: () => {
            setState('dragging');
            // TODO(wittjosiah): Collapse open items during a drag.
          },
          onDrop: () => {
            setState('idle');
            // TODO(wittjosiah): Expand open items after a drag.
          },
        }),
        dropTargetForElements({
          element: ref.current,
          getData: ({ input, element }) => {
            return attachInstruction(item, {
              input,
              element,
              indentPerLevel: DEFAULT_INDENTATION,
              currentLevel: level,
              mode,
              block: isBranch ? [] : ['make-child'],
            });
          },
          canDrop: ({ source }) => {
            const _canDrop = canDrop ?? (() => true);
            return source.element !== ref.current && _canDrop(source.data);
          },
          getIsSticky: () => true,
          onDrag: ({ self, source }) => {
            const instruction = extractInstruction(self.data);

            if (source.data.id !== item.id) {
              // TODO(wittjosiah): Expand after 500ms if still merging.
              setInstruction(instruction);
            } else if (instruction?.type === 'reparent') {
              setInstruction(instruction);
            } else {
              setInstruction(null);
            }
          },
          onDragLeave: () => {
            setInstruction(null);
          },
          onDrop: () => {
            setInstruction(null);
          },
        }),
      );
    }, [draggable, item, mode, canDrop]);

    const handleOpenChange = useCallback(() => onOpenChange?.(id, !open), [onOpenChange, id, open]);
    const handleSelect = useCallback(() => onSelect?.(id, !current), [onSelect, id, current]);

    return (
      <Treegrid.Row
        ref={ref}
        key={id}
        id={path.join(Treegrid.PATH_SEPARATOR)}
        aria-labelledby={`${id}__label`}
        parentOf={isBranch ? parentOf.join(Treegrid.PARENT_OF_SEPARATOR) : undefined}
        classNames='grid aria-[current]:bg-input'
        // NOTE(thure): This is intentionally an empty string to for descendents to select by in the CSS
        //   without alerting the user (except for in the correct link element). See also:
        //   https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Attributes/aria-current#description
        aria-current={current ? ('' as 'page') : undefined}
      >
        <Treegrid.Cell indent classNames='relative flex items-center' style={paddingIndendation(level)}>
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
            variant='ghost'
            density='fine'
            classNames='grow gap-1 !pis-0.5 hover:!bg-transparent dark:hover:!bg-transparent'
            onClick={handleSelect}
          >
            {icon && <Icon icon={icon ?? 'ph--placeholder--regular'} size={5} classNames='is-[1em] bs-[1em] mlb-1' />}
            <span className='flex-1 is-0 truncate text-start'>{name}</span>
          </Button>
          {instruction && <DropIndicator instruction={instruction} />}
        </Treegrid.Cell>
      </Treegrid.Row>
    );
  },
);
