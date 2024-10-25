//
// Copyright 2024 DXOS.org
//

import '@dxos/lit-grid/dx-grid.pcss';

import { createComponent, type EventName } from '@lit/react';
import { createContextScope, type Scope } from '@radix-ui/react-context';
import { useControllableState } from '@radix-ui/react-use-controllable-state';
import React, {
  type ComponentProps,
  forwardRef,
  type PropsWithChildren,
  useCallback,
  useLayoutEffect,
  useState,
} from 'react';

import { type DxAxisResize, type DxEditRequest, type DxGridCellsSelect, DxGrid as NaturalDxGrid } from '@dxos/lit-grid';
import { useForwardedRef } from '@dxos/react-ui';

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

type GridEditing = { index: DxEditRequest['cellIndex']; initialContent: DxEditRequest['initialContent'] } | null;

type GridContextValue = {
  id: string;
  editing: GridEditing;
  setEditing: (nextEditing: GridEditing) => void;
  editBox: GridEditBox;
  setEditBox: (nextEditBox: GridEditBox) => void;
};

type GridScopedProps<P> = P & { __gridScope?: Scope };

const GRID_NAME = 'Grid';

const [createGridContext, createGridScope] = createContextScope(GRID_NAME, []);

const [GridProvider, useGridContext] = createGridContext<GridContextValue>(GRID_NAME);

type GridRootProps = PropsWithChildren<
  { id: string } & Partial<{
    editing: GridEditing;
    defaultEditing: GridEditing;
    onEditingChange: (nextEditing: GridEditing) => void;
  }>
>;

const GridRoot = ({
  id,
  editing: propsEditing,
  defaultEditing,
  onEditingChange,
  children,
  __gridScope,
}: GridScopedProps<GridRootProps>) => {
  const [editing = null, setEditing] = useControllableState({
    prop: propsEditing,
    defaultProp: defaultEditing,
    onChange: onEditingChange,
  });
  const [editBox, setEditBox] = useState<GridEditBox>(initialBox);
  return (
    <GridProvider
      id={id}
      editing={editing}
      setEditing={setEditing}
      editBox={editBox}
      setEditBox={setEditBox}
      scope={__gridScope}
    >
      {children}
    </GridProvider>
  );
};

GridRoot.displayName = GRID_NAME;

type GridContentProps = Omit<ComponentProps<typeof DxGrid>, 'onEdit'> & {
  getCells?: NonNullable<NaturalDxGrid['getCells']>;
  activeRefs?: string;
};

const GRID_CONTENT_NAME = 'GridContent';

const GridContent = forwardRef<NaturalDxGrid, GridScopedProps<GridContentProps>>((props, forwardedRef) => {
  const { id, editing, setEditBox, setEditing } = useGridContext(GRID_CONTENT_NAME, props.__gridScope);
  const dxGrid = useForwardedRef(forwardedRef);

  // Needed instead of `useEffect` to ensure the DxGrid ref is defined.
  useLayoutEffect(() => {
    if (dxGrid.current && props.getCells) {
      dxGrid.current.getCells = props.getCells;
      dxGrid.current.requestUpdate('initialCells');
    }
  }, [props.getCells]);

  const handleEdit = useCallback((event: DxEditRequest) => {
    setEditBox(event.cellBox);
    setEditing({ index: event.cellIndex, initialContent: event.initialContent });
  }, []);

  return <DxGrid {...props} gridId={id} mode={editing ? 'edit' : 'browse'} onEdit={handleEdit} ref={dxGrid} />;
});

GridContent.displayName = GRID_CONTENT_NAME;

export const Grid = {
  Root: GridRoot,
  Content: GridContent,
};

export { GridRoot, GridContent, useGridContext, createGridScope };

export type { GridRootProps, GridContentProps, GridEditing, GridEditBox, GridScopedProps, DxGridElement };

export { colToA1Notation, rowToA1Notation, closestCell, commentedClassName } from '@dxos/lit-grid';

export type {
  DxGridRange,
  DxGridAxisMeta,
  DxAxisResize,
  DxGridCells,
  DxGridPlaneRange,
  DxGridPlaneCells,
  DxGridCellIndex,
  DxGridCellValue,
  DxGridPlane,
  DxGridPosition,
} from '@dxos/lit-grid';
