//
// Copyright 2024 DXOS.org
//

import { RegistryContext } from '@effect/atom-react/RegistryContext';
import { type EventName, createComponent } from '@lit/react';
import React, {
  type ComponentProps,
  type PropsWithChildren,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import '@dxos/lit-grid/dx-grid.pcss';
import {
  type DxAxisResize,
  type DxEditRequest,
  type DxGridCellsSelect,
  type DxGridPosition,
  type DxGridRange,
  DxGrid as NaturalDxGrid,
  isSameCell,
} from '@dxos/lit-grid';
import { useControllableState } from '@dxos/react-hooks';
import { type AwarenessProvider } from '@dxos/ui-editor';

import {
  type GridAddressing,
  type GridSelection,
  GridSelectionModel,
  bindAwareness,
  toRange,
  toSelection,
} from '../selection/index.ts';
import { GRID_NAME, GridProvider, useGridContext } from './GridContext.ts';

type DxGridElement = NaturalDxGrid;

const DxGrid = createComponent({
  tagName: 'dx-grid',
  elementClass: NaturalDxGrid,
  react: React,
  events: {
    onAxisResize: 'dx-axis-resize' as EventName<DxAxisResize>,
    onEdit: 'dx-edit-request' as EventName<DxEditRequest>,
    onSelect: 'dx-grid-cells-select' as EventName<DxGridCellsSelect>,
  },
});

type GridEditBox = DxEditRequest['cellBox'];

const initialBox = {
  insetInlineStart: 0,
  insetBlockStart: 0,
  inlineSize: 0,
  blockSize: 0,
} satisfies GridEditBox;

type GridEditing = {
  index: DxEditRequest['cellIndex'];
  cellElement: DxEditRequest['cellElement'];
  initialContent: DxEditRequest['initialContent'];
} | null;

export type GridContextValue = {
  id: string;
  editing: GridEditing;
  setEditing: (nextEditing: GridEditing) => void;
  editBox: GridEditBox;
  setEditBox: (nextEditBox: GridEditBox) => void;
  selection: GridSelectionModel;
};

type GridRootProps = PropsWithChildren<
  {
    id: string;
  } & Partial<{
    editing: GridEditing;
    defaultEditing: GridEditing;
    onEditingChange: (nextEditing: GridEditing) => void;
    /** Shares the local selection with collaborators and shows theirs. */
    awareness: AwarenessProvider;
  }>
>;

// TODO(burdon): Make headless.
const GridRoot = ({
  children,
  id,
  editing: propsEditing,
  defaultEditing,
  onEditingChange,
  awareness,
}: GridRootProps) => {
  const [editing = null, setEditing] = useControllableState({
    prop: propsEditing,
    defaultProp: defaultEditing,
    onChange: onEditingChange,
  });
  const [editBox, setEditBox] = useState<GridEditBox>(initialBox);
  const registry = useContext(RegistryContext);
  const selection = useMemo(() => new GridSelectionModel(registry), [registry]);
  useEffect(
    () => (awareness ? bindAwareness(registry, selection, awareness) : undefined),
    [registry, selection, awareness],
  );

  return (
    <GridProvider
      id={id}
      editing={editing}
      setEditing={setEditing}
      editBox={editBox}
      setEditBox={setEditBox}
      selection={selection}
    >
      <div className='dx-grid-host' style={{ display: 'contents' }}>
        {children}
      </div>
    </GridProvider>
  );
};

GridRoot.displayName = GRID_NAME;

const GRID_CONTENT_NAME = 'GridContent';

type GridContentProps = Omit<ComponentProps<typeof DxGrid>, 'onEdit' | 'remoteSelections'> & {
  getCells?: NaturalDxGrid['getCells'];
  activeRefs?: string;
  /**
   * Names the grid's cells by row and column identity. Without it the grid neither records the local selection in the
   * shared model nor shows collaborators' selections, since a visual index is not stable across their views.
   */
  addressing?: GridAddressing;
};

const GridContent = forwardRef<NaturalDxGrid, GridContentProps>(({ addressing, onSelect, ...props }, forwardedRef) => {
  const { id, editing, setEditBox, setEditing, selection } = useGridContext(GRID_CONTENT_NAME);
  const [dxGrid, setDxGridInternal] = useState<NaturalDxGrid | null>(null);

  // NOTE(thure): using `useState` instead of `useRef` works with refs provided by `@lit/react` and gives us
  // a reliable dependency for `useEffect` whereas `useLayoutEffect` does not guarantee the element will be defined.
  const setDxGrid = useCallback(
    (nextDxGrid: NaturalDxGrid | null) => {
      setDxGridInternal(nextDxGrid);
      if (forwardedRef) {
        if (typeof forwardedRef === 'function') {
          forwardedRef?.(nextDxGrid);
        } else {
          forwardedRef.current = nextDxGrid;
        }
      }
    },
    [forwardedRef, dxGrid],
  );

  useEffect(() => {
    if (dxGrid && props.getCells) {
      dxGrid.getCells = props.getCells;
      dxGrid.requestUpdate('initialCells');
    }
  }, [props.getCells, dxGrid]);

  const handleEdit = useCallback((event: DxEditRequest) => {
    setEditBox(event.cellBox);
    setEditing({ index: event.cellIndex, cellElement: event.cellElement, initialContent: event.initialContent });
  }, []);

  const handleSelect = useCallback(
    (event: DxGridCellsSelect) => {
      // While editing, a selection picks a range for the formula, not the user's selection. A range on cells without an
      // identity, such as a header, clears it, so collaborators stop showing a cell the user has left.
      if (!editing && addressing) {
        selection.select(toSelection(addressing, event.range));
      }
      onSelect?.(event);
    },
    [editing, addressing, selection, onSelect],
  );

  // dx-grid reports no selection while editing, and a range picked for a formula is not the user's. When the edit ends,
  // the selection is the cell focus moved to (Enter, Tab, a click), or else what it was when the edit began (Escape,
  // leaving the grid), found by id since rows may have moved meanwhile; `setSelection` reports it, so the model and the
  // consumer both see it.
  const editStart = useRef<
    { selection: DxGridRange; focused: DxGridPosition; local: GridSelection | undefined } | undefined
  >(undefined);
  useEffect(() => {
    // Without addressing the grid records no selection, so an edit leaves dx-grid's own selection alone.
    if (!dxGrid || !addressing) {
      return;
    }
    if (editing) {
      // A selection whose row is already gone is not what the user is editing; the edit is then of the focused cell
      // alone, kept by id too, since rows may move before it ends.
      const local = selection.getLocal();
      const focused = dxGrid.getFocusedCell();
      editStart.current ??= {
        selection: dxGrid.getSelection(),
        focused,
        local: local && toRange(addressing, local) ? local : toSelection(addressing, { start: focused, end: focused }),
      };
    } else if (editStart.current) {
      const { selection: before, focused, local } = editStart.current;
      editStart.current = undefined;
      const now = dxGrid.getFocusedCell();
      if (!isSameCell(now, focused)) {
        dxGrid.setSelection({ start: now, end: { ...now } });
      } else if (!local) {
        // Nothing resolvable was selected, so the edit was of this cell alone; the range the grid showed before may name
        // rows the user never chose.
        dxGrid.setSelection({ start: focused, end: { ...focused } });
      } else {
        // Focus is where the edit began; if that was the selection's start, it follows the start to its current row,
        // even if a formula range was picked meanwhile. A selection whose row is gone keeps naming it.
        const restored = toRange(addressing, local);
        if (restored) {
          dxGrid.moveSelection(restored, { focus: !!isSameCell(focused, before.start) });
          // The grid reports only a change of position; the cell it already shows may still be new to the model.
          selection.select(local);
        }
      }
    }
  }, [editing, dxGrid, addressing, selection]);

  // The selection names its cells by id. When they move, dx-grid's position-based highlight follows, and focus too if it
  // was on the selection's start (`moveSelection`), so focus on a header or outside the grid stays put.
  useEffect(() => {
    const local = selection.getLocal();
    if (!dxGrid || !addressing || editing || !local) {
      return;
    }

    // A row or column that no longer resolves may be deleted or only filtered out, which addressing cannot tell apart,
    // so the selection keeps naming it and the grid is left where it is until it comes back.
    const range = toRange(addressing, local);
    if (range) {
      dxGrid.moveSelection(range);
    }
  }, [dxGrid, selection, addressing, editing]);

  // Collaborators' selections go to dx-grid directly. Re-rendering on each of their moves would rewrite every dx-grid
  // property, including the `mode` the sheet sets while a formula takes a range.
  const registry = useContext(RegistryContext);
  useEffect(() => {
    if (!dxGrid) {
      return;
    }

    const update = () => {
      dxGrid.remoteSelections = addressing ? selection.resolvePeers(addressing) : [];
    };
    update();
    return registry.subscribe(selection.peers, update);
  }, [dxGrid, selection, addressing, registry]);

  return (
    <DxGrid
      {...props}
      gridId={id}
      mode={editing ? 'edit' : 'browse'}
      onEdit={handleEdit}
      onSelect={handleSelect}
      ref={setDxGrid}
    />
  );
});

GridContent.displayName = GRID_CONTENT_NAME;

//
// Fragments
//

//
// Exports
//

export const Grid = {
  Root: GridRoot,
  Content: GridContent,
};

export { GridContent, GridRoot };

export type { DxGridElement, GridContentProps, GridEditBox, GridEditing, GridRootProps };

export type {
  DxAxisResize,
  DxGridAxis,
  DxGridAxisMeta,
  DxGridCellIndex,
  DxGridCells,
  DxGridCellValue,
  DxGridPlane,
  DxGridPlaneCellIndex,
  DxGridPlaneCells,
  DxGridPlanePosition,
  DxGridPlaneRange,
  DxGridPosition,
  DxGridRange,
  DxGridRemoteSelection,
} from '@dxos/lit-grid';
