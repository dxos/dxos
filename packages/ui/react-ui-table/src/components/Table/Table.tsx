//
// Copyright 2024 DXOS.org
//

import * as String from 'effect/String';
import React, {
  type JSX,
  type MouseEvent,
  type PropsWithChildren,
  type Ref,
  type WheelEvent,
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
} from 'react';

import { type Type } from '@dxos/echo';
import { log } from '@dxos/log';
import { useAttention } from '@dxos/react-ui-attention';
import {
  type DxGridElement,
  type DxGridPlane,
  type DxGridPlaneRange,
  type DxGridPosition,
  Grid,
  type GridContentProps,
  closestCell,
  gridSeparatorBlockEnd,
  gridSeparatorInlineEnd,
} from '@dxos/react-ui-grid';
import { DxEditRequest } from '@dxos/react-ui-grid';
import { mx } from '@dxos/react-ui-theme';

import { type InsertRowResult, ModalController, type TableModel, type TablePresentation } from '../../model';
import { tableButtons, tableControls } from '../../util';
import { type OnCreateHandler, type TableCellEditorProps, TableValueEditor } from '../TableCellEditor';

import { ColumnActionsMenu } from './ColumnActionsMenu';
import { ColumnSettings } from './ColumnSettings';
import { RowActionsMenu } from './RowActionsMenu';

const columnDefault = { grid: { minSize: 80, maxSize: 640 } };
const rowDefault = { frozenRowsStart: { readonly: true, focusUnfurl: false } };

//
// Table.Root
//

export type TableRootProps = PropsWithChildren<{ role?: string }>;

const TableRoot = ({ children, role = 'article' }: TableRootProps) => {
  return (
    <div
      role='none'
      className={mx(
        'relative !border-separator [&_.dx-grid]:max-is-[--dx-grid-content-inline-size] [&_.dx-grid]:max-bs-[--dx-grid-content-block-size]',
        role === 'card--popover' && 'popover-card-height',
        role === 'section' && 'attention-surface',
        role === 'card--intrinsic' && '[&_.dx-grid]:bs-[--dx-grid-content-block-size]',
        ['card--popover', 'section', 'card--extrinsic'].includes(role) && 'overflow-hidden',
        ['article', 'slide'].includes(role) && 'flex flex-col [&_.dx-grid]:grow [&_.dx-grid]:bs-0',
      )}
    >
      {children}
    </div>
  );
};

//
// Table.Main
//

export type TableController = {
  update?: (cell?: DxGridPosition) => void;
  handleInsertRowResult?: (insertRowResult?: InsertRowResult) => void;
};

export type TableMainProps<T extends Type.Entity.Any = Type.Entity.Any> = {
  schema?: T;
  model?: TableModel;
  presentation?: TablePresentation;
  // TODO(burdon): Rename since attention isn't a useful concept here? Standardize across other components. Pass property into useAttention.
  ignoreAttention?: boolean;
  onCreate?: OnCreateHandler;
  onRowClick?: (row: any) => void;
  testId?: string;
};

const TableMainInner = <T extends Type.Entity.Any = Type.Entity.Any>(
  { schema, model, presentation, ignoreAttention, onCreate, onRowClick, testId }: TableMainProps<T>,
  forwardedRef: Ref<TableController>,
) => {
  const [dxGrid, setDxGrid] = useState<DxGridElement | null>(null);
  const { hasAttention } = useAttention(model?.id ?? 'table');
  const modals = useMemo(() => new ModalController(), []);

  const draftRowCount = model?.getDraftRowCount() ?? 0;

  const frozen = useMemo(() => {
    const noActionColumn =
      model?.features.dataEditable === false &&
      model?.features.schemaEditable === false &&
      model.rowActions.length === 0;

    return {
      frozenRowsStart: 1,
      frozenRowsEnd: Math.max(1, draftRowCount),
      frozenColsStart: model?.features.selection.enabled ? 1 : 0,
      frozenColsEnd: noActionColumn ? 0 : 1,
    };
  }, [model, draftRowCount]);

  const getCells = useCallback<NonNullable<GridContentProps['getCells']>>(
    (range: DxGridPlaneRange, plane: DxGridPlane) => presentation?.getCells(range, plane) ?? {},
    [presentation],
  );


  useEffect(() => {
    if (!dxGrid || !presentation) {
      return;
    }

    dxGrid.getCells = getCells;
  }, [dxGrid, presentation, getCells]);

  const handleInsertRowResult = useCallback(
    (insertResult?: InsertRowResult) => {
      if (insertResult === 'draft') {
        requestAnimationFrame(() => {
          dxGrid?.setFocus({ plane: 'frozenRowsEnd', col: 0, row: 0 });
          dxGrid?.refocus();
        });
      } else {
        requestAnimationFrame(() => {
          dxGrid?.setFocus({ plane: 'grid', col: 0, row: model ? model.getRowCount() - 1 : 0 });
          dxGrid?.refocus();
        });
      }
    },
    [model, dxGrid],
  );

  const handleSave = useCallback(() => {
    dxGrid?.updateCells(true);
    dxGrid?.requestUpdate();
  }, [dxGrid]);

  const handleSaveDraftRow = useCallback(
    (rowIndex = 0) => {
      if (model && dxGrid) {
        const didCommitSuccessfully = model.commitDraftRow(rowIndex);
        if (didCommitSuccessfully) {
          requestAnimationFrame(() => {
            dxGrid.scrollToEndRow();
          });
        }
      }
    },
    [model, dxGrid],
  );

  const handleGridClick = useCallback(
    (event: MouseEvent) => {
      const cell = closestCell(event.target as HTMLElement);
      if (cell) {
        const { row: rowIndex, plane } = cell;
        if (onRowClick) {
          if (plane === 'grid') {
            const row = model?.getRowAt(rowIndex);
            row && onRowClick(row);
          } else {
            onRowClick(cell);
          }
        }

        if (model?.features.selection.enabled && model?.selection.selectionMode === 'single') {
          model.selection.toggleSelectionForRowIndex(rowIndex);
        }
      }

      if (!modals) {
        return;
      }

      const buttonSelector = Object.values(tableButtons)
        .map((button) => `button[${button.attr}]`)
        .join(',');

      const tableButtonElement = (event.target as HTMLElement).closest(buttonSelector) as HTMLElement;
      if (tableButtonElement) {
        const button = Object.values(tableButtons).find((btn) => tableButtonElement.hasAttribute(btn.attr));
        if (!button) {
          return;
        }

        modals.setTrigger(tableButtonElement);
        const data = button.getData(tableButtonElement);
        switch (data.type) {
          case 'rowMenu': {
            modals.showRowMenu(data.rowIndex);
            break;
          }
          case 'columnSettings': {
            modals.showColumnMenu(data.fieldId);
            break;
          }
          case 'newColumn': {
            modals.showColumnCreator();
            break;
          }
          case 'sort': {
            model?.toggleSort(data.fieldId);
            break;
          }
          case 'saveDraftRow': {
            handleSaveDraftRow();
            break;
          }
        }
        return;
      }

      const controlSelector = Object.values(tableControls)
        .map((control) => `input[${control.attr}]`)
        .join(',');

      const controlElement = (event.target as HTMLElement).closest(controlSelector) as HTMLElement;
      if (controlElement) {
        const control = Object.values(tableControls).find((ctrl) => controlElement.hasAttribute(ctrl.attr));
        if (!control) {
          return;
        }

        const data = control.getData(controlElement);
        switch (data.type) {
          case 'checkbox': {
            if (data.header) {
              model?.selection.setSelection(model.selection.allRowsSeleted.value ? 'none' : 'all');
            } else {
              model?.selection.toggleSelectionForRowIndex(data.rowIndex);
            }
            break;
          }
          case 'switch': {
            if (model) {
              model.updateCellData({ row: data.rowIndex, col: data.colIndex }, (value) => !value);
            }
            break;
          }
        }
      }
    },
    [model, modals, dxGrid],
  );

  const handleFocus = useCallback<NonNullable<TableCellEditorProps['onFocus']>>(
    (increment, delta, cell) => {
      if (dxGrid && model) {
        if (cell?.plane === 'grid' && cell?.row >= model.getRowCount() - 1 && increment !== 'col') {
          handleInsertRowResult(draftRowCount < 1 ? model.insertRow() : 'final');
        } else if (cell?.plane === 'frozenRowsEnd' && increment === 'row') {
          handleSaveDraftRow(cell.row);
          handleInsertRowResult(model.insertRow());
        } else {
          dxGrid.refocus(increment, delta);
        }
      }
    },
    [dxGrid, model],
  );

  const handleKeyDown = useCallback<NonNullable<GridContentProps['onKeyDown']>>(
    (event) => {
      if (!model?.features.dataEditable) {
        return;
      }

      const cell = closestCell(event.target);
      if (!model || !cell) {
        return;
      }

      // Handle Meta+C (Copy) and Meta+V (Paste) commands
      if (event.metaKey || event.ctrlKey) {
        switch (event.key) {
          case 'c': {
            // Copy focused cell's text content to clipboard
            try {
              const cellData = model.getCellData(cell);
              const textContent = cellData?.toString() ?? '';
              void navigator.clipboard.writeText(textContent);
              event.preventDefault();
            } catch (error) {
              log.catch(error);
            }
            break;
          }
          case 'v': {
            // Paste clipboard content to focused cell
            event.preventDefault();
            void navigator.clipboard.readText().then((clipboardText) => {
              try {
                // Attempt to set the cell's content to clipboard content
                model.setCellData(cell, String.trim(clipboardText).replace(/[\n\r]+/, ' '));
                handleSave();
              } catch {
                // If validation fails, emit a DxEditRequest event with initialContent from clipboard
                // TODO(thure): Should `dx-grid` expose a method like this?
                const cellElement = (event.target as HTMLElement).closest(
                  '[data-dx-grid-action="cell"]',
                ) as HTMLElement;
                if (cellElement) {
                  const rect = cellElement.getBoundingClientRect();
                  const editRequest = new DxEditRequest({
                    cellIndex: `${cell.plane},${cell.col},${cell.row}`,
                    cellBox: {
                      insetInlineStart: rect.left,
                      insetBlockStart: rect.top,
                      inlineSize: rect.width,
                      blockSize: rect.height,
                    },
                    cellElement,
                    initialContent: clipboardText,
                  });
                  cellElement.dispatchEvent(editRequest);
                }
              }
            });
            break;
          }
        }
      }

      switch (event.key) {
        case 'Backspace':
        case 'Delete': {
          try {
            model.setCellData(cell, undefined);
            event.preventDefault();
            handleSave();
          } catch {
            // Delete results in a validation error; don’t prevent default so dx-grid can emit an edit request.
          }
          break;
        }
      }
    },
    [model, dxGrid, handleSave],
  );

  const handleAxisResize = useCallback<NonNullable<GridContentProps['onAxisResize']>>(
    (event) => {
      if (event.axis === 'col') {
        const columnIndex = parseInt(event.index, 10);
        model?.setColumnWidth(columnIndex, event.size);
      }
    },
    [model],
  );

  const handleWheel = useCallback(
    (event: WheelEvent) => {
      if (!ignoreAttention && !hasAttention) {
        event.stopPropagation();
      }
    },
    [hasAttention, ignoreAttention],
  );

  const handleNewColumn = useCallback(() => {
    const columns = model?.getColumnCount();
    if (dxGrid && columns) {
      dxGrid.scrollToColumn(columns - 1);
    }
  }, [model, dxGrid]);

  /**
   * Provides an external controller that can be called to repaint the table.
   */
  useImperativeHandle<TableController, TableController>(forwardedRef, () => {
    if (!dxGrid || !presentation) {
      return {};
    }

    return {
      update: (cell) => {
        if (cell) {
          dxGrid.updateIfWithinBounds(cell, true);
        } else {
          dxGrid.updateCells(true);
          dxGrid.requestUpdate();
        }
      },
      handleInsertRowResult,
    };
  }, [dxGrid, model, presentation]);

  if (!model || !modals) {
    return <span role='none' className='attention-surface' />;
  }

  return (
    <Grid.Root id={model.id ?? 'table-grid'}>
      <TableValueEditor<T>
        model={model}
        modals={modals}
        schema={schema}
        onFocus={handleFocus}
        onSave={handleSave}
        onCreate={onCreate}
      />
      <Grid.Content
        className={mx('[--dx-grid-base:var(--baseSurface)]', gridSeparatorInlineEnd, gridSeparatorBlockEnd)}
        frozen={frozen}
        columns={model.columnMeta.value}
        columnDefault={columnDefault}
        rowDefault={rowDefault}
        limitRows={model.getRowCount() ?? 0}
        limitColumns={model.projection.fields.length}
        overscroll='trap'
        onAxisResize={handleAxisResize}
        onClick={handleGridClick}
        onKeyDownCapture={handleKeyDown}
        onWheelCapture={handleWheel}
        {...(testId && { 'data-testid': testId })}
        ref={setDxGrid}
      />
      <RowActionsMenu model={model} modals={modals} />
      <ColumnActionsMenu model={model} modals={modals} />
      <ColumnSettings model={model} modals={modals} onNewColumn={handleNewColumn} />
    </Grid.Root>
  );
};

const TableMain = forwardRef(TableMainInner) as <T extends Type.Entity.Any = Type.Entity.Any>(
  props: TableMainProps<T> & { ref?: Ref<TableController> },
) => JSX.Element;

export const Table = {
  Root: TableRoot,
  Main: TableMain,
};
