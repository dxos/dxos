//
// Copyright 2024 DXOS.org
//

import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
import { draggable, dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import {
  attachInstruction,
  extractInstruction,
  type Instruction,
  type ItemMode,
} from '@atlaskit/pragmatic-drag-and-drop-hitbox/tree-item';
import { Schema } from 'effect';
import React, { memo, useCallback, useEffect, useMemo, useRef, useState, type FC, type KeyboardEvent } from 'react';

import { type HasId } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { Treegrid, TreeItem as NaturalTreeItem } from '@dxos/react-ui';
import {
  ghostHover,
  hoverableControls,
  hoverableFocusedKeyboardControls,
  hoverableFocusedWithinControls,
  mx,
} from '@dxos/react-ui-theme';

import { useTree } from './TreeContext';
import { TreeItemHeading } from './TreeItemHeading';
import { TreeItemToggle } from './TreeItemToggle';
import { DEFAULT_INDENTATION, paddingIndentation } from './helpers';

type TreeItemState = 'idle' | 'dragging' | 'preview' | 'parent-of-instruction';

const hoverableDescriptionIcons =
  '[--icons-color:inherit] hover-hover:[--icons-color:var(--description-text)] hover-hover:hover:[--icons-color:inherit] focus-within:[--icons-color:inherit]';

export const TreeDataSchema = Schema.Struct({
  id: Schema.String,
  path: Schema.Array(Schema.String),
  item: Schema.Any,
});

export type TreeData = Schema.Schema.Type<typeof TreeDataSchema>;

export const isTreeData = (data: unknown): data is TreeData => Schema.is(TreeDataSchema)(data);

export type TreeItemProps<T extends HasId = any> = {
  item: T;
  path: string[];
  levelOffset?: number;
  last: boolean;
  draggable?: boolean;
  renderColumns?: FC<{
    item: T;
    path: string[];
    open: boolean;
    menuOpen: boolean;
    setMenuOpen: (open: boolean) => void;
  }>;
  canDrop?: (params: { source: TreeData; target: TreeData }) => boolean;
  onOpenChange?: (params: { item: T; path: string[]; open: boolean }) => void;
  onSelect?: (params: { item: T; path: string[]; current: boolean; option: boolean }) => void;
};

const RawTreeItem = <T extends HasId = any>({
  item,
  path: _path,
  last,
  draggable: _draggable,
  renderColumns: Columns,
  canDrop,
  onOpenChange,
  onSelect,
  levelOffset = 2,
}: TreeItemProps<T>) => {
  const rowRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const openRef = useRef(false);
  const cancelExpandRef = useRef<NodeJS.Timeout | null>(null);
  const [_state, setState] = useState<TreeItemState>('idle');
  const [instruction, setInstruction] = useState<Instruction | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const { useItems, getProps, isOpen, isCurrent } = useTree();
  const items = useItems(item);
  const { id, label, parentOf, icon, disabled, className, headingClassName, testId } = getProps(item, _path);
  const path = useMemo(() => [..._path, id], [_path, id]);
  const open = isOpen(path, item);
  const current = isCurrent(path, item);
  const level = path.length - levelOffset;
  const isBranch = !!parentOf;
  const mode: ItemMode = last ? 'last-in-group' : open ? 'expanded' : 'standard';

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

    const data = { id, path, item } satisfies TreeData;

    // https://atlassian.design/components/pragmatic-drag-and-drop/core-package/adapters/element/about
    return combine(
      draggable({
        element: buttonRef.current,
        getInitialData: () => data,
        onDragStart: () => {
          setState('dragging');
          if (open) {
            openRef.current = true;
            onOpenChange?.({ item, path, open: false });
          }
        },
        onDrop: () => {
          setState('idle');
          if (openRef.current) {
            onOpenChange?.({ item, path, open: true });
          }
        },
      }),
      // https://github.com/atlassian/pragmatic-drag-and-drop/blob/main/packages/hitbox/constellation/index/about.mdx
      dropTargetForElements({
        element: buttonRef.current,
        getData: ({ input, element }) => {
          return attachInstruction(data, {
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
          return source.element !== buttonRef.current && _canDrop({ source: source.data as TreeData, target: data });
        },
        getIsSticky: () => true,
        onDrag: ({ self, source }) => {
          const instruction = extractInstruction(self.data);

          if (source.data.id !== id) {
            if (instruction?.type === 'make-child' && isBranch && !open && !cancelExpandRef.current) {
              cancelExpandRef.current = setTimeout(() => {
                onOpenChange?.({ item, path, open: true });
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
  }, [_draggable, item, id, mode, path, open, canDrop]);

  // Cancel expand on unmount.
  useEffect(() => () => cancelExpand(), [cancelExpand]);

  const handleOpenChange = useCallback(
    () => onOpenChange?.({ item, path, open: !open }),
    [onOpenChange, item, path, open],
  );

  const handleSelect = useCallback(
    (option = false) => {
      if (isBranch) {
        handleOpenChange();
      } else {
        rowRef.current?.focus();
        onSelect?.({ item, path, current: !current, option });
      }
    },
    [item, path, current, isBranch, handleOpenChange, onSelect],
  );

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
          handleSelect(event.altKey);
          break;
      }
    },
    [isBranch, open, handleOpenChange, handleSelect],
  );

  return (
    <>
      <Treegrid.Row
        ref={rowRef}
        key={id}
        id={id}
        aria-labelledby={`${id}__label`}
        parentOf={parentOf?.join(Treegrid.PARENT_OF_SEPARATOR)}
        classNames={mx(
          'grid grid-cols-subgrid col-[tree-row] mbs-0.5 aria-[current]:bg-activeSurface',
          hoverableControls,
          hoverableFocusedKeyboardControls,
          hoverableFocusedWithinControls,
          hoverableDescriptionIcons,
          ghostHover,
          className,
        )}
        data-itemid={id}
        data-testid={testId}
        // NOTE(thure): This is intentionally an empty string to for descendents to select by in the CSS
        //   without alerting the user (except for in the correct link element). See also:
        //   https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Attributes/aria-current#description
        aria-current={current ? ('' as 'page') : undefined}
        onKeyDown={handleKeyDown}
        onContextMenu={(event) => {
          event.preventDefault();
          setMenuOpen(true);
        }}
      >
        <Treegrid.Cell
          indent
          classNames='relative grid grid-cols-subgrid col-[tree-row]'
          style={paddingIndentation(level)}
        >
          <div role='none' className='flex items-center'>
            <TreeItemToggle isBranch={isBranch} open={open} onToggle={handleOpenChange} />
            <TreeItemHeading
              ref={buttonRef}
              label={label}
              icon={icon}
              className={headingClassName}
              disabled={disabled}
              current={current}
              onSelect={handleSelect}
            />
          </div>
          {Columns && <Columns item={item} path={path} open={open} menuOpen={menuOpen} setMenuOpen={setMenuOpen} />}
          {instruction && <NaturalTreeItem.DropIndicator instruction={instruction} gap={2} />}
        </Treegrid.Cell>
      </Treegrid.Row>
      {open &&
        items.map((item, index) => (
          <TreeItem
            key={item.id}
            item={item}
            path={path}
            last={index === items.length - 1}
            draggable={_draggable}
            renderColumns={Columns}
            canDrop={canDrop}
            onOpenChange={onOpenChange}
            onSelect={onSelect}
          />
        ))}
    </>
  );
};

export const TreeItem = memo(RawTreeItem) as FC<TreeItemProps>;
