//
// Copyright 2024 DXOS.org
//

import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
import { draggable, dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import {
  type Instruction,
  type ItemMode,
  attachInstruction,
  extractInstruction,
} from '@atlaskit/pragmatic-drag-and-drop-hitbox/tree-item';
import { useAtomValue } from '@effect-atom/atom-react';
import * as Schema from 'effect/Schema';
import React, {
  type FC,
  type KeyboardEvent,
  type MouseEvent,
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { invariant } from '@dxos/invariant';
import { TreeItem as NaturalTreeItem, Treegrid } from '@dxos/react-ui';
import {
  ghostFocusWithin,
  ghostHover,
  hoverableControls,
  hoverableFocusedKeyboardControls,
  hoverableFocusedWithinControls,
  mx,
} from '@dxos/ui-theme';

import { DEFAULT_INDENTATION, paddingIndentation } from './helpers';
import { useTree } from './TreeContext';
import { TreeItemHeading } from './TreeItemHeading';
import { TreeItemToggle } from './TreeItemToggle';

const hoverableDescriptionIcons =
  '[--icons-color:inherit] hover-hover:[--icons-color:var(--description-text)] hover-hover:hover:[--icons-color:inherit] focus-within:[--icons-color:inherit]';

type TreeItemDragState = 'idle' | 'dragging' | 'preview' | 'parent-of-instruction';

export const TreeDataSchema = Schema.Struct({
  id: Schema.String,
  path: Schema.Array(Schema.String),
  item: Schema.Any,
});

export type TreeData = Schema.Schema.Type<typeof TreeDataSchema>;
export const isTreeData = (data: unknown): data is TreeData => Schema.is(TreeDataSchema)(data);

export type ColumnRenderer<T extends { id: string } = any> = FC<{
  item: T;
  path: string[];
  open: boolean;
  menuOpen: boolean;
  setMenuOpen: (open: boolean) => void;
}>;

export type TreeItemProps<T extends { id: string } = any> = {
  item: T;
  path: string[];
  levelOffset?: number;
  last: boolean;
  draggable?: boolean;
  renderColumns?: ColumnRenderer<T>;
  blockInstruction?: (params: { instruction: Instruction; source: TreeData; target: TreeData }) => boolean;
  canDrop?: (params: { source: TreeData; target: TreeData }) => boolean;
  canSelect?: (params: { item: T; path: string[] }) => boolean;
  onOpenChange?: (params: { item: T; path: string[]; open: boolean }) => void;
  onSelect?: (params: { item: T; path: string[]; current: boolean; option: boolean }) => void;
  onItemHover?: (params: { item: T }) => void;
};

const RawTreeItem = <T extends { id: string } = any>({
  item,
  path: _path,
  levelOffset = 2,
  last,
  draggable: _draggable,
  renderColumns: Columns,
  blockInstruction,
  canDrop,
  canSelect,
  onOpenChange,
  onSelect,
  onItemHover,
}: TreeItemProps<T>) => {
  const rowRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const openRef = useRef(false);
  const cancelExpandRef = useRef<NodeJS.Timeout | null>(null);
  const [_state, setState] = useState<TreeItemDragState>('idle');
  const [instruction, setInstruction] = useState<Instruction | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const {
    itemProps: itemPropsAtom,
    childIds: childIdsAtom,
    itemOpen: itemOpenAtom,
    itemCurrent: itemCurrentAtom,
  } = useTree();
  const path = useMemo(() => [..._path, item.id], [_path, item.id]);

  const { id, parentOf, label, className, headingClassName, icon, iconHue, disabled, testId } = useAtomValue(
    itemPropsAtom(path),
  );
  const childIds = useAtomValue(childIdsAtom(item.id));
  const open = useAtomValue(itemOpenAtom(path));
  const current = useAtomValue(itemCurrentAtom(path));

  const level = path.length - levelOffset;
  const isBranch = !!parentOf;
  const mode: ItemMode = last ? 'last-in-group' : open ? 'expanded' : 'standard';
  const canSelectItem = canSelect?.({ item, path }) ?? true;
  const data = { id, path, item } satisfies TreeData;

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
          const desired = extractInstruction(self.data);
          const block =
            desired && blockInstruction?.({ instruction: desired, source: source.data as TreeData, target: data });
          const instruction: Instruction | null =
            block && desired.type !== 'instruction-blocked' ? { type: 'instruction-blocked', desired } : desired;

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
  }, [_draggable, item, id, mode, path, open, blockInstruction, canDrop]);

  // Cancel expand on unmount.
  useEffect(() => () => cancelExpand(), [cancelExpand]);

  const handleOpenToggle = useCallback(
    () => onOpenChange?.({ item, path, open: !open }),
    [onOpenChange, item, path, open],
  );

  const handleSelect = useCallback(
    (option = false) => {
      // If the item is a branch, toggle it if:
      //   - also holding down the option key
      //   - or the item is currently selected
      if (isBranch && (option || current)) {
        handleOpenToggle();
      } else if (canSelectItem) {
        canSelect?.({ item, path });
        rowRef.current?.focus();
        onSelect?.({ item, path, current: !current, option });
      }
    },
    [item, path, current, isBranch, canSelectItem, handleOpenToggle, onSelect],
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      switch (event.key) {
        case 'ArrowRight':
        case 'ArrowLeft':
          isBranch && handleOpenToggle();
          break;
      }
    },
    [isBranch, open, handleOpenToggle, handleSelect],
  );

  const handleItemHover = useCallback(() => {
    onItemHover?.({ item });
  }, [onItemHover, item]);

  const handleContextMenu = useCallback(
    (event: MouseEvent) => {
      event.preventDefault();
      setMenuOpen(true);
    },
    [setMenuOpen],
  );

  const childProps = {
    draggable: _draggable,
    renderColumns: Columns,
    blockInstruction,
    canDrop,
    canSelect,
    onOpenChange,
    onSelect,
  };

  return (
    <>
      <Treegrid.Row
        ref={rowRef}
        key={id}
        id={id}
        aria-labelledby={`${id}__label`}
        parentOf={parentOf?.join(Treegrid.PARENT_OF_SEPARATOR)}
        data-object-id={id}
        data-testid={testId}
        // NOTE(thure): This is intentionally an empty string to for descendents to select by in the CSS
        //   without alerting the user (except for in the correct link element). See also:
        //   https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Attributes/aria-current#description
        aria-current={current ? ('' as 'page') : undefined}
        classNames={mx(
          'grid grid-cols-subgrid col-[tree-row] mt-0.5 is-current:bg-active-surface',
          hoverableControls,
          hoverableFocusedKeyboardControls,
          hoverableFocusedWithinControls,
          hoverableDescriptionIcons,
          ghostFocusWithin,
          ghostHover,
          className,
        )}
        onKeyDown={handleKeyDown}
        onMouseEnter={handleItemHover}
        onContextMenu={handleContextMenu}
      >
        <div
          role='none'
          className='indent relative grid grid-cols-subgrid col-[tree-row]'
          style={paddingIndentation(level)}
        >
          <Treegrid.Cell classNames='flex items-center'>
            <TreeItemToggle isBranch={isBranch} open={open} onClick={handleOpenToggle} />
            <TreeItemHeading
              disabled={disabled}
              current={current}
              label={label}
              className={headingClassName}
              icon={icon}
              iconHue={iconHue}
              onSelect={handleSelect}
              ref={buttonRef}
            />
          </Treegrid.Cell>
          {Columns && <Columns item={item} path={path} open={open} menuOpen={menuOpen} setMenuOpen={setMenuOpen} />}
          {instruction && <NaturalTreeItem.DropIndicator instruction={instruction} gap={2} />}
        </div>
      </Treegrid.Row>
      {open &&
        childIds.map((childId, index) => (
          <TreeItemById key={childId} id={childId} path={path} last={index === childIds.length - 1} {...childProps} />
        ))}
    </>
  );
};

export const TreeItem = memo(RawTreeItem) as FC<TreeItemProps>;

/** Resolves a child ID to an item via the `item` atom and renders a TreeItem. */
export type TreeItemByIdProps = Omit<TreeItemProps, 'item'> & { id: string };

const RawTreeItemById = <T extends { id: string } = any>({ id, ...props }: TreeItemByIdProps) => {
  const { item: itemAtom } = useTree();
  const item = useAtomValue(itemAtom(id)) as T | undefined;
  if (!item) {
    return null;
  }
  return <TreeItem item={item} {...props} />;
};

export const TreeItemById = memo(RawTreeItemById) as FC<TreeItemByIdProps>;
