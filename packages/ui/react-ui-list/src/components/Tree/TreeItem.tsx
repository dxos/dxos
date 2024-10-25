//
// Copyright 2024 DXOS.org
//

import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
import { draggable, dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
// https://github.com/atlassian/pragmatic-drag-and-drop/blob/main/packages/hitbox/constellation/index/about.mdx
import {
  attachInstruction,
  extractInstruction,
  type ItemMode,
  type Instruction,
} from '@atlaskit/pragmatic-drag-and-drop-hitbox/tree-item';
import React, { memo, type KeyboardEvent, useCallback, useEffect, useRef, useState, type FC } from 'react';

import { invariant } from '@dxos/invariant';
import { Treegrid } from '@dxos/react-ui';
import {
  focusRing,
  hoverableControls,
  hoverableFocusedKeyboardControls,
  hoverableFocusedWithinControls,
  mx,
} from '@dxos/react-ui-theme';

import { DropIndicator } from './DropIndicator';
import { TreeItemHeading } from './TreeItemHeading';
import { TreeItemToggle } from './TreeItemToggle';
import { DEFAULT_INDENTATION, paddingIndendation } from './helpers';
import { type ItemType } from './types';

type TreeItemState = 'idle' | 'dragging' | 'preview' | 'parent-of-instruction';

const hoverableDescriptionIcons =
  '[--icons-color:inherit] hover-hover:[--icons-color:var(--description-text)] hover-hover:hover:[--icons-color:inherit] focus-within:[--icons-color:inherit]';

export type TreeItemProps = {
  item: ItemType;
  mode: ItemMode;
  open: boolean;
  current: boolean;
  draggable?: boolean;
  renderColumns?: FC<{ item: ItemType }>;
  canDrop?: (data: unknown) => boolean;
  onOpenChange?: (item: ItemType, nextOpen: boolean) => void;
  onSelect?: (item: ItemType, nextState: boolean) => void;
};

// TODO(wittjosiah): Styles.
export const TreeItem = memo(
  ({
    item,
    mode,
    open,
    current,
    draggable: _draggable,
    renderColumns: Columns,
    canDrop,
    onOpenChange,
    onSelect,
  }: TreeItemProps) => {
    const { id, label, icon, className, disabled, path, parentOf } = item;
    const level = path.length - 1;
    const isBranch = !!parentOf;

    const rowRef = useRef<HTMLDivElement | null>(null);
    const buttonRef = useRef<HTMLButtonElement | null>(null);
    const openRef = useRef(false);
    const cancelExpandRef = useRef<NodeJS.Timeout | null>(null);
    const [_state, setState] = useState<TreeItemState>('idle');
    const [instruction, setInstruction] = useState<Instruction | null>(null);

    const cancelExpand = useCallback(() => {
      if (cancelExpandRef.current) {
        clearTimeout(cancelExpandRef.current);
        cancelExpandRef.current = null;
      }
    }, []);

    useEffect(() => {
      if (!_draggable) {
        return;
      }

      invariant(buttonRef.current);

      // https://atlassian.design/components/pragmatic-drag-and-drop/core-package/adapters/element/about
      return combine(
        draggable({
          element: buttonRef.current,
          getInitialData: () => item,
          onDragStart: () => {
            setState('dragging');
            if (open) {
              openRef.current = true;
              onOpenChange?.(item, false);
            }
          },
          onDrop: () => {
            setState('idle');
            if (openRef.current) {
              onOpenChange?.(item, true);
            }
          },
        }),
        dropTargetForElements({
          element: buttonRef.current,
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
            return source.element !== buttonRef.current && _canDrop(source.data);
          },
          getIsSticky: () => true,
          onDrag: ({ self, source }) => {
            const instruction = extractInstruction(self.data);

            if (source.data.id !== item.id) {
              if (instruction?.type === 'make-child' && isBranch && !open && !cancelExpandRef.current) {
                cancelExpandRef.current = setTimeout(() => {
                  onOpenChange?.(item, true);
                }, 500);
              }

              if (instruction?.type !== 'make-child') {
                cancelExpand();
              }

              setInstruction(instruction);
            } else if (instruction?.type === 'reparent') {
              // TODO(wittjosiah): This is not occurring in the current implementation.
              setInstruction(instruction);
            } else {
              setInstruction(null);
            }
          },
          onDragLeave: () => {
            cancelExpand();
            setInstruction(null);
          },
          onDrop: () => {
            cancelExpand();
            setInstruction(null);
          },
        }),
      );
    }, [draggable, item, mode, open, canDrop]);

    // Cancel expand on unmount.
    useEffect(() => () => cancelExpand(), [cancelExpand]);

    const handleOpenChange = useCallback(() => onOpenChange?.(item, !open), [onOpenChange, item, open]);

    const handleSelect = useCallback(() => {
      rowRef.current?.focus();
      onSelect?.(item, !current);
    }, [onSelect, item, current]);

    const handleKeyDown = useCallback(
      (event: KeyboardEvent) => {
        switch (event.key) {
          case 'ArrowRight':
            isBranch && !open && handleOpenChange();
            break;
          case 'ArrowLeft':
            isBranch && open && handleOpenChange();
            break;
          case ' ':
            handleSelect();
            break;
        }
      },
      [isBranch, open, handleOpenChange, handleSelect],
    );

    return (
      <Treegrid.Row
        ref={rowRef}
        key={id}
        id={path.join(Treegrid.PATH_SEPARATOR)}
        aria-labelledby={`${id}__label`}
        parentOf={parentOf?.join(Treegrid.PARENT_OF_SEPARATOR)}
        classNames={mx(
          'grid grid-cols-subgrid col-[tree-row] aria-[current]:bg-input',
          hoverableControls,
          hoverableFocusedKeyboardControls,
          hoverableFocusedWithinControls,
          hoverableDescriptionIcons,
          focusRing,
        )}
        data-itemid={item.id}
        data-testid={item.testId}
        // NOTE(thure): This is intentionally an empty string to for descendents to select by in the CSS
        //   without alerting the user (except for in the correct link element). See also:
        //   https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Attributes/aria-current#description
        aria-current={current ? ('' as 'page') : undefined}
        onKeyDown={handleKeyDown}
      >
        <Treegrid.Cell
          indent
          classNames='relative grid grid-cols-subgrid col-[tree-row]'
          style={paddingIndendation(level)}
        >
          <div role='none' className='flex items-center'>
            <TreeItemToggle open={open} isBranch={isBranch} onToggle={handleOpenChange} />
            <TreeItemHeading
              ref={buttonRef}
              label={label}
              icon={icon}
              className={className}
              disabled={disabled}
              current={current}
              onSelect={handleSelect}
            />
          </div>
          {Columns && <Columns item={item} />}
          {instruction && <DropIndicator instruction={instruction} />}
        </Treegrid.Cell>
      </Treegrid.Row>
    );
  },
);
