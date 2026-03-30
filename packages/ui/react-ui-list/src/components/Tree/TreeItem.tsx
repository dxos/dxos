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
  path: pathProp,
  levelOffset = 2,
  last,
  draggable: draggableProp,
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
  const lastCanDropLogRef = useRef<string | null>(null);
  const lastInstructionLogRef = useRef<string | null>(null);
  const nativeEventLogRef = useRef<Record<string, boolean>>({});
  const [_state, setState] = useState<TreeItemDragState>('idle');
  const [instruction, setInstruction] = useState<Instruction | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const {
    itemProps: itemPropsAtom,
    childIds: childIdsAtom,
    itemOpen: itemOpenAtom,
    itemCurrent: itemCurrentAtom,
  } = useTree();
  const path = useMemo(() => [...pathProp, item.id], [pathProp, item.id]);

  const {
    id,
    parentOf,
    draggable: itemDraggable,
    droppable: itemDroppable,
    label,
    className,
    headingClassName,
    icon,
    iconHue,
    disabled,
    testId,
  } = useAtomValue(itemPropsAtom(path));
  const childIds = useAtomValue(childIdsAtom(item.id));
  const open = useAtomValue(itemOpenAtom(path));
  const current = useAtomValue(itemCurrentAtom(path));

  const level = path.length - levelOffset;
  const isBranch = !!parentOf;
  const mode: ItemMode = last ? 'last-in-group' : open ? 'expanded' : 'standard';
  const canSelectItem = canSelect?.({ item, path }) ?? true;
  const data = { id, path, item } satisfies TreeData;
  const shouldSeedNativeDragData = typeof document !== 'undefined' && document.body.hasAttribute('data-platform');

  const cancelExpand = useCallback(() => {
    if (cancelExpandRef.current) {
      clearTimeout(cancelExpandRef.current);
      cancelExpandRef.current = null;
    }
  }, []);

  const isItemDraggable = draggableProp && itemDraggable !== false;
  const isItemDroppable = itemDroppable !== false;
  const nativeDragText = id;

  useEffect(() => {
    if (!draggableProp || !rowRef.current || !buttonRef.current) {
      return;
    }

    nativeEventLogRef.current = {};
    const listeners = [
      { element: rowRef.current, elementRole: 'row' },
      { element: buttonRef.current, elementRole: 'button' },
    ] as const;

    const removers = listeners.flatMap(({ element, elementRole }) => {
      const log = (eventType: string, event: DragEvent) => {
        const key = `${elementRole}:${eventType}`;
        if (nativeEventLogRef.current[key]) {
          return;
        }
        nativeEventLogRef.current[key] = true;
        // #region agent log H6
        fetch('http://127.0.0.1:7242/ingest/2fc9cc4c-4972-4b72-bea5-aa0a81d6e670',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'4cdd86'},body:JSON.stringify({sessionId:'4cdd86',runId:'initial',hypothesisId:'H6',location:'TreeItem.tsx:native-events',message:'Native drag event observed on tree item',data:{id,path,elementRole,eventType,targetTag:event.target instanceof Element ? event.target.tagName : null,currentTargetTag:event.currentTarget instanceof Element ? event.currentTarget.tagName : null},timestamp:Date.now()})}).catch(()=>{});
        // #endregion
      };

      const onDragStart = (event: DragEvent) => {
        // #region agent log H8
        fetch('http://127.0.0.1:7242/ingest/2fc9cc4c-4972-4b72-bea5-aa0a81d6e670',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'4cdd86'},body:JSON.stringify({sessionId:'4cdd86',runId:'initial',hypothesisId:'H8',location:'TreeItem.tsx:native-dragstart',message:'Native dragstart observed on tree item',data:{id,path,elementRole,types:event.dataTransfer ? Array.from(event.dataTransfer.types) : [],items:event.dataTransfer?.items?.length ?? null,effectAllowed:event.dataTransfer?.effectAllowed ?? null,dropEffect:event.dataTransfer?.dropEffect ?? null},timestamp:Date.now()})}).catch(()=>{});
        // #endregion
      };
      const onDragEnter = (event: DragEvent) => log('dragenter', event);
      const onDragOver = (event: DragEvent) => log('dragover', event);
      const onDragEnd = (event: DragEvent) => {
        // #region agent log H9
        fetch('http://127.0.0.1:7242/ingest/2fc9cc4c-4972-4b72-bea5-aa0a81d6e670',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'4cdd86'},body:JSON.stringify({sessionId:'4cdd86',runId:'initial',hypothesisId:'H9',location:'TreeItem.tsx:native-dragend',message:'Native dragend observed on tree item',data:{id,path,elementRole,dropEffect:event.dataTransfer?.dropEffect ?? null},timestamp:Date.now()})}).catch(()=>{});
        // #endregion
      };
      const onDrop = (event: DragEvent) => {
        log('drop', event);
        nativeEventLogRef.current = {};
      };
      const onDragLeave = () => {
        nativeEventLogRef.current[`${elementRole}:dragenter`] = false;
        nativeEventLogRef.current[`${elementRole}:dragover`] = false;
      };

      element.addEventListener('dragstart', onDragStart);
      element.addEventListener('dragenter', onDragEnter);
      element.addEventListener('dragover', onDragOver);
      element.addEventListener('dragleave', onDragLeave);
      element.addEventListener('dragend', onDragEnd);
      element.addEventListener('drop', onDrop);

      return [
        () => element.removeEventListener('dragstart', onDragStart),
        () => element.removeEventListener('dragenter', onDragEnter),
        () => element.removeEventListener('dragover', onDragOver),
        () => element.removeEventListener('dragleave', onDragLeave),
        () => element.removeEventListener('dragend', onDragEnd),
        () => element.removeEventListener('drop', onDrop),
      ];
    });

    return () => removers.forEach((remove) => remove());
  }, [draggableProp, id, path]);

  useEffect(() => {
    if (!draggableProp) {
      return;
    }

    invariant(buttonRef.current);

    const makeDraggable = () =>
      draggable({
        element: buttonRef.current!,
        getInitialData: () => data,
        getInitialDataForExternal: () => {
          if (!shouldSeedNativeDragData) {
            return undefined;
          }

          // #region agent log H10
          fetch('http://127.0.0.1:7242/ingest/2fc9cc4c-4972-4b72-bea5-aa0a81d6e670',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'4cdd86'},body:JSON.stringify({sessionId:'4cdd86',runId:'post-fix-2',hypothesisId:'H10',location:'TreeItem.tsx:getInitialDataForExternal',message:'Seeded native drag data for tree item',data:{id,path,mediaTypes:['text/plain'],plainTextLength:nativeDragText.length},timestamp:Date.now()})}).catch(()=>{});
          // #endregion
          return { 'text/plain': nativeDragText };
        },
        onDragStart: () => {
          // #region agent log H1
          fetch('http://127.0.0.1:7242/ingest/2fc9cc4c-4972-4b72-bea5-aa0a81d6e670',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'4cdd86'},body:JSON.stringify({sessionId:'4cdd86',runId:'initial',hypothesisId:'H1',location:'TreeItem.tsx:onDragStart',message:'Tree item drag started',data:{id,path,open,hasTauriDragRegionAncestor:Boolean(buttonRef.current?.closest('[data-tauri-drag-region]')),hasAppDragAncestor:Boolean(buttonRef.current?.closest('.dx-app-drag'))},timestamp:Date.now()})}).catch(()=>{});
          // #endregion
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
      });

    if (!isItemDroppable) {
      return isItemDraggable ? makeDraggable() : undefined;
    }

    const dropTarget = dropTargetForElements({
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
        const allowed = source.element !== buttonRef.current && _canDrop({ source: source.data as TreeData, target: data });
        const logKey = JSON.stringify({ sourceId: (source.data as TreeData | undefined)?.id ?? null, targetId: id, allowed });
        if (lastCanDropLogRef.current !== logKey) {
          lastCanDropLogRef.current = logKey;
          // #region agent log H2
          fetch('http://127.0.0.1:7242/ingest/2fc9cc4c-4972-4b72-bea5-aa0a81d6e670',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'4cdd86'},body:JSON.stringify({sessionId:'4cdd86',runId:'initial',hypothesisId:'H2',location:'TreeItem.tsx:canDrop',message:'Tree item canDrop evaluated',data:{id,path,sourceId:(source.data as TreeData | undefined)?.id??null,targetId:data.id,allowed,hasTauriDragRegionAncestor:Boolean(buttonRef.current?.closest('[data-tauri-drag-region]')),hasAppDragAncestor:Boolean(buttonRef.current?.closest('.dx-app-drag'))},timestamp:Date.now()})}).catch(()=>{});
          // #endregion
        }
        return allowed;
      },
      getIsSticky: () => true,
      onDrag: ({ self, source }) => {
        const desired = extractInstruction(self.data);
        const block =
          desired && blockInstruction?.({ instruction: desired, source: source.data as TreeData, target: data });
        const instruction: Instruction | null =
          block && desired.type !== 'instruction-blocked' ? { type: 'instruction-blocked', desired } : desired;
        const logKey = JSON.stringify({
          sourceId: (source.data as TreeData | undefined)?.id ?? null,
          targetId: id,
          desiredType: desired?.type ?? null,
          blocked: Boolean(block),
          instructionType: instruction?.type ?? null,
        });
        if (lastInstructionLogRef.current !== logKey) {
          lastInstructionLogRef.current = logKey;
          // #region agent log H3
          fetch('http://127.0.0.1:7242/ingest/2fc9cc4c-4972-4b72-bea5-aa0a81d6e670',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'4cdd86'},body:JSON.stringify({sessionId:'4cdd86',runId:'initial',hypothesisId:'H3',location:'TreeItem.tsx:onDrag',message:'Tree item drag instruction computed',data:{id,path,sourceId:(source.data as TreeData | undefined)?.id??null,targetId:data.id,desiredType:desired?.type??null,blocked:Boolean(block),instructionType:instruction?.type??null,isBranch,open},timestamp:Date.now()})}).catch(()=>{});
          // #endregion
        }

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
    });

    if (!isItemDraggable) {
      return dropTarget;
    }

    // https://atlassian.design/components/pragmatic-drag-and-drop/core-package/adapters/element/about
    return combine(makeDraggable(), dropTarget);
  }, [draggableProp, isItemDraggable, isItemDroppable, item, id, mode, path, open, blockInstruction, canDrop]);

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
    draggable: draggableProp,
    renderColumns: Columns,
    blockInstruction,
    canDrop,
    canSelect,
    onItemHover,
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
