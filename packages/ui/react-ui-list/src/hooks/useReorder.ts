//
// Copyright 2026 DXOS.org
//

import { autoScrollForElements } from '@atlaskit/pragmatic-drag-and-drop-auto-scroll/element';
import {
  type Edge,
  attachClosestEdge,
  extractClosestEdge,
} from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge';
import { getReorderDestinationIndex } from '@atlaskit/pragmatic-drag-and-drop-hitbox/util/get-reorder-destination-index';
import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
import {
  type ElementDragPayload,
  draggable,
  dropTargetForElements,
  monitorForElements,
} from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { setCustomNativeDragPreview } from '@atlaskit/pragmatic-drag-and-drop/element/set-custom-native-drag-preview';
import { type ReactNode, type RefCallback, useCallback, useEffect, useMemo, useRef, useState } from 'react';

/**
 * Internal payload key. We attach this to every draggable's data so the root monitor can
 * recognise drops that belong to its own list and ignore foreign payloads.
 */
const REORDER_LIST_KEY = '__dxosReorderListId';

let reorderListIdCounter = 0;
const allocateReorderListId = (): string => `reorder-${++reorderListIdCounter}`;

export type ReorderAxis = 'vertical' | 'horizontal';

export type ReorderItemState =
  | { type: 'idle' }
  | { type: 'preview'; container: HTMLElement }
  | { type: 'dragging' }
  | { type: 'dragging-over'; closestEdge: Edge | null };

const IDLE: ReorderItemState = { type: 'idle' };

export type UseReorderListOptions<T> = {
  /** Authoritative item list. Read on each drop to compute the new index. */
  items: readonly T[];
  /** Stable identifier per item. The monitor uses this to find source/target indices. */
  getId: (item: T) => string;
  /** Called with `(fromIndex, toIndex)` when a drop completes inside this list. */
  onMove: (fromIndex: number, toIndex: number) => void;
  /** Drop axis. Defaults to `'vertical'`. */
  axis?: ReorderAxis;
  /** When true, drag handles report as disabled. Defaults to false. */
  readonly?: boolean;
  /** Forwarded to pragmatic-dnd's `getInitialData` on each draggable. */
  getInitialData?: (item: T, index: number) => Record<string, unknown>;
  /** Overrides the default `canDrop` (which matches payloads tagged with this list's id). */
  canDrop?: (args: { source: ElementDragPayload }) => boolean;
  /** Renderer for a custom native drag preview. */
  getDragPreview?: (item: T) => ReactNode;
};

export type ReorderActive<T> = { id: string; item: T; container: HTMLElement } | null;

/**
 * Stable controller created by `useReorderList`. Item components consume it via
 * `useReorderItem(controller, id)`. The controller is reference-stable across renders.
 */
export type ReorderListController<T> = {
  /** Internal: list id; payload tagged with this is the only data the monitor accepts by default. */
  listId: string;
  /** Look up an item by id. Used by the item hook to bind pragmatic-dnd at register time. */
  getItem: (id: string) => { item: T; index: number } | null;
  /** Bind a row's pragmatic-dnd primitives. Idempotent; returns a cleanup function. */
  bindItem: (
    id: string,
    refs: { row: HTMLElement; handle: HTMLElement },
    onItemState: (state: ReorderItemState) => void,
  ) => () => void;
};

export type UseReorderListReturn<T> = {
  controller: ReorderListController<T>;
  /** The currently-dragging item, or null. Used by global drag preview portals. */
  active: ReorderActive<T>;
  /** Same as `controller.listId`. Exposed for diagnostics. */
  listId: string;
};

/**
 * List-level reorder aspect. Spins up pragmatic-dnd's `monitorForElements` and produces a
 * stable controller that per-row hooks consume. Item registration + the per-item draggable /
 * drop-target wiring lives in `useReorderItem` so each row owns its own React state without
 * re-rendering siblings on hover.
 */
export const useReorderList = <T>({
  items,
  getId,
  onMove,
  axis = 'vertical',
  readonly = false,
  getInitialData,
  canDrop,
  getDragPreview,
}: UseReorderListOptions<T>): UseReorderListReturn<T> => {
  const listIdRef = useRef<string | null>(null);
  if (!listIdRef.current) {
    listIdRef.current = allocateReorderListId();
  }
  const listId = listIdRef.current;

  // Stable refs to mutable inputs so the controller and the monitor effect don't tear down
  // on every render. The functions returned in `controller` read from these refs.
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const getIdRef = useRef(getId);
  getIdRef.current = getId;
  const onMoveRef = useRef(onMove);
  onMoveRef.current = onMove;
  const canDropRef = useRef(canDrop);
  canDropRef.current = canDrop;
  const getInitialDataRef = useRef(getInitialData);
  getInitialDataRef.current = getInitialData;
  const getDragPreviewRef = useRef(getDragPreview);
  getDragPreviewRef.current = getDragPreview;
  const readonlyRef = useRef(readonly);
  readonlyRef.current = readonly;

  const [active, setActive] = useState<ReorderActive<T>>(null);

  const findIndex = useCallback((id: string): number => {
    return itemsRef.current.findIndex((item) => getIdRef.current(item) === id);
  }, []);

  const findIndexFromPayload = useCallback(
    (data: Record<string, unknown> | undefined): number => {
      if (!data || data[REORDER_LIST_KEY] !== listId) {
        return -1;
      }
      const id = data.id as string | undefined;
      return id ? findIndex(id) : -1;
    },
    [listId, findIndex],
  );

  // The list-level monitor watches drops belonging to this list and computes the destination
  // index using pragmatic-dnd's helper. Mounted once per list lifetime.
  useEffect(() => {
    return monitorForElements({
      canMonitor: ({ source }) => {
        if (canDropRef.current) {
          return canDropRef.current({ source });
        }
        return source.data[REORDER_LIST_KEY] === listId;
      },
      onDrop: ({ location, source }) => {
        const target = location.current.dropTargets[0];
        if (!target) {
          return;
        }
        const sourceIdx = findIndexFromPayload(source.data);
        const targetIdx = findIndexFromPayload(target.data);
        if (sourceIdx < 0 || targetIdx < 0) {
          return;
        }
        const destinationIndex = getReorderDestinationIndex({
          closestEdgeOfTarget: extractClosestEdge(target.data),
          startIndex: sourceIdx,
          indexOfTarget: targetIdx,
          axis,
        });
        onMoveRef.current(sourceIdx, destinationIndex);
      },
    });
  }, [listId, axis, findIndexFromPayload]);

  // The controller is reference-stable. Item-level hooks call `bindItem` to register their
  // DOM elements with pragmatic-dnd; `getItem` is the synchronous lookup used at bind time.
  const controller = useMemo<ReorderListController<T>>(
    () => ({
      listId,
      getItem: (id) => {
        const index = findIndex(id);
        if (index < 0) {
          return null;
        }
        return { item: itemsRef.current[index], index };
      },
      bindItem: (id, refs, onItemState) => {
        const lookup = () => {
          const index = findIndex(id);
          return { item: itemsRef.current[index], index };
        };
        const { item, index } = lookup();
        if (!item && index < 0) {
          return () => {};
        }
        const allowedEdges: Edge[] = axis === 'vertical' ? ['top', 'bottom'] : ['left', 'right'];
        return combine(
          draggable({
            element: refs.row,
            dragHandle: refs.handle,
            canDrag: () => !readonlyRef.current,
            getInitialData: () => {
              const current = lookup();
              return {
                [REORDER_LIST_KEY]: listId,
                id,
                ...(getInitialDataRef.current?.(current.item, current.index) ?? {}),
              };
            },
            onGenerateDragPreview: getDragPreviewRef.current
              ? ({ nativeSetDragImage, source }) => {
                  const rect = source.element.getBoundingClientRect();
                  setCustomNativeDragPreview({
                    nativeSetDragImage,
                    getOffset: ({ container }) => ({ x: 20, y: container.getBoundingClientRect().height / 2 }),
                    render: ({ container }) => {
                      container.style.width = `${rect.width}px`;
                      onItemState({ type: 'preview', container });
                      const current = lookup();
                      setActive({ id, item: current.item, container });
                      return () => {
                        onItemState(IDLE);
                        setActive(null);
                      };
                    },
                  });
                }
              : undefined,
            onDragStart: () => {
              onItemState({ type: 'dragging' });
              const current = lookup();
              setActive({ id, item: current.item, container: refs.row });
            },
            onDrop: () => {
              onItemState(IDLE);
              setActive(null);
            },
          }),
          dropTargetForElements({
            element: refs.row,
            canDrop: ({ source }) => {
              if (source.element === refs.row) {
                return false;
              }
              if (canDropRef.current) {
                return canDropRef.current({ source });
              }
              return source.data[REORDER_LIST_KEY] === listId;
            },
            getData: ({ input }) =>
              attachClosestEdge({ [REORDER_LIST_KEY]: listId, id }, { element: refs.row, input, allowedEdges }),
            getIsSticky: () => true,
            onDragEnter: ({ self }) => {
              onItemState({ type: 'dragging-over', closestEdge: extractClosestEdge(self.data) });
            },
            onDrag: ({ self }) => {
              onItemState({ type: 'dragging-over', closestEdge: extractClosestEdge(self.data) });
            },
            onDragLeave: () => onItemState(IDLE),
            onDrop: () => onItemState(IDLE),
          }),
        );
      },
    }),
    [listId, axis, findIndex],
  );

  return { controller, active, listId };
};

export type ReorderItemBinding = {
  rowRef: RefCallback<HTMLElement>;
  handleRef: RefCallback<HTMLElement>;
  state: ReorderItemState;
  isDragging: boolean;
  closestEdge: Edge | null;
};

/**
 * Per-row reorder hook. Owns the row's local state and registers the row's DOM elements
 * with the list controller once both `rowRef` and `handleRef` are attached. Unmounting (or
 * detaching either ref) tears down the registration.
 *
 * Called inside the item component, not in the parent's render loop — this is what keeps
 * us inside the rules of hooks.
 */
export const useReorderItem = <T>(controller: ReorderListController<T>, id: string): ReorderItemBinding => {
  const [state, setState] = useState<ReorderItemState>(IDLE);

  // Snapshot the attached DOM nodes between renders without disturbing the React tree. When
  // both refs have resolved we register with the list controller; either detaching triggers
  // cleanup so we never leak pragmatic-dnd bindings.
  const rowElement = useRef<HTMLElement | null>(null);
  const handleElement = useRef<HTMLElement | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  const tryRegister = useCallback(() => {
    if (!rowElement.current || !handleElement.current) {
      return;
    }
    cleanupRef.current?.();
    cleanupRef.current = controller.bindItem(id, { row: rowElement.current, handle: handleElement.current }, setState);
  }, [controller, id]);

  const teardown = useCallback(() => {
    cleanupRef.current?.();
    cleanupRef.current = null;
    setState(IDLE);
  }, []);

  // Re-register if the controller or id changes (e.g. items reorder identity-stable).
  useEffect(() => {
    tryRegister();
    return teardown;
  }, [tryRegister, teardown]);

  const rowRef = useCallback<RefCallback<HTMLElement>>(
    (node) => {
      rowElement.current = node;
      if (node) {
        tryRegister();
      } else {
        teardown();
      }
    },
    [tryRegister, teardown],
  );

  const handleRef = useCallback<RefCallback<HTMLElement>>(
    (node) => {
      handleElement.current = node;
      if (node && rowElement.current) {
        tryRegister();
      } else if (!node) {
        // Mirror rowRef: if either ref detaches, tear down pragmatic-dnd bindings so a
        // re-attaching handle creates a fresh registration rather than racing the old one.
        teardown();
      }
    },
    [tryRegister, teardown],
  );

  return {
    rowRef,
    handleRef,
    state,
    isDragging: state.type === 'dragging',
    closestEdge: state.type === 'dragging-over' ? state.closestEdge : null,
  };
};

/**
 * Wire pragmatic-dnd's auto-scroll on a scrollable container. While any pragmatic-dnd drag
 * is in flight, hovering near the edges of the registered element scrolls the container
 * automatically. Pair with `OrderedList.Viewport` (or any caller-owned ScrollArea) so long
 * lists can be reordered without manually scrolling first.
 *
 * `autoScrollForElements` is global — it activates on every drag regardless of which list
 * started it — so it's safe to register one element per scroll surface.
 *
 * Returns a callback ref so the registration fires as soon as the element attaches and the
 * cleanup fires when it detaches; React doesn't re-run effects on mutable `ref.current`
 * changes, so a plain `useEffect` on a `useRef` would miss late-mounting elements entirely.
 */
export const useReorderAutoScroll = (): RefCallback<HTMLElement> => {
  const cleanupRef = useRef<(() => void) | null>(null);
  return useCallback((node) => {
    cleanupRef.current?.();
    cleanupRef.current = node ? autoScrollForElements({ element: node }) : null;
  }, []);
};
