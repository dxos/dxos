//
// Copyright 2024 DXOS.org
//

import { type EventName, createComponent } from '@lit/react';
import React, {
  type ComponentProps,
  type PropsWithChildren,
  forwardRef,
  useCallback,
  useEffect,
  useState,
} from 'react';

import '@dxos/lit-grid/dx-grid.pcss';
import { type DxAxisResize, type DxEditRequest, type DxGridCellsSelect, DxGrid as NaturalDxGrid } from '@dxos/lit-grid';
import { useControllableState } from '@dxos/react-hooks';

import { GRID_NAME, GridProvider, useGridContext } from './GridContext';

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
};

type GridRootProps = PropsWithChildren<
  {
    id: string;
  } & Partial<{
    editing: GridEditing;
    defaultEditing: GridEditing;
    onEditingChange: (nextEditing: GridEditing) => void;
  }>
>;

// TODO(burdon): Make headless.
const GridRoot = ({ children, id, editing: propsEditing, defaultEditing, onEditingChange }: GridRootProps) => {
  const [editing = null, setEditing] = useControllableState({
    prop: propsEditing,
    defaultProp: defaultEditing,
    onChange: onEditingChange,
  });
  const [editBox, setEditBox] = useState<GridEditBox>(initialBox);
  return (
    <GridProvider id={id} editing={editing} setEditing={setEditing} editBox={editBox} setEditBox={setEditBox}>
      <div className='dx-grid-host' style={{ display: 'contents' }}>
        {children}
      </div>
    </GridProvider>
  );
};

GridRoot.displayName = GRID_NAME;

const GRID_CONTENT_NAME = 'GridContent';

type GridContentProps = Omit<ComponentProps<typeof DxGrid>, 'onEdit'> & {
  getCells?: NaturalDxGrid['getCells'];
  activeRefs?: string;
};

const GridContent = forwardRef<NaturalDxGrid, GridContentProps>((props, forwardedRef) => {
  const { id, editing, setEditBox, setEditing } = useGridContext(GRID_CONTENT_NAME);
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

  return <DxGrid {...props} gridId={id} mode={editing ? 'edit' : 'browse'} onEdit={handleEdit} ref={setDxGrid} />;
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
} from '@dxos/lit-grid';
