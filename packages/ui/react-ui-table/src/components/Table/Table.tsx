//
// Copyright 2024 DXOS.org
//

import { type Schema } from 'effect/Schema';
import React, {
  type MouseEvent,
  type PropsWithChildren,
  type WheelEvent,
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
} from 'react';

import { type Client } from '@dxos/client';
import { Filter } from '@dxos/echo';
import { getValue } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
// TODO(wittjosiah): Remove dependency on react-client.
import { getSpace } from '@dxos/react-client/echo';
import { useTranslation } from '@dxos/react-ui';
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
import { mx } from '@dxos/react-ui-theme';
import { isNotFalsy, safeParseInt } from '@dxos/util';

import { ModalController, type TableModel, type TablePresentation } from '../../model';
import { translationKey } from '../../translations';
import { tableButtons, tableControls } from '../../util';
import { type TableCellEditorProps, TableValueEditor, createOption } from '../TableCellEditor';

import { ColumnActionsMenu } from './ColumnActionsMenu';
import { ColumnSettings } from './ColumnSettings';
import { CreateRefPanel } from './CreateRefPanel';
import { RowActionsMenu } from './RowActionsMenu';

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
};

export type TableMainProps = {
  model?: TableModel;
  presentation?: TablePresentation;
  schema?: Schema.AnyNoContext;
  client?: Client;
  // TODO(burdon): Rename since attention isn't a useful concept here? Standardize across other components. Pass property into useAttention.
  ignoreAttention?: boolean;
  onRowClick?: (row: any) => void;
};

const TableMain = forwardRef<TableController, TableMainProps>(
  ({ model, presentation, ignoreAttention, schema, client, onRowClick }, forwardedRef) => {
    const [dxGrid, setDxGrid] = useState<DxGridElement | null>(null);
    const { hasAttention } = useAttention(model?.id ?? 'table');
    const { t } = useTranslation(translationKey);
    const modals = useMemo(() => new ModalController(), []);

    const draftRowCount = model?.getDraftRowCount() ?? 0;

    const frozen = useMemo(() => {
      const noActionColumn =
        model?.features.dataEditable === false &&
        model?.features.schemaEditable === false &&
        model.rowActions.length === 0;

      return {
        frozenRowsStart: 1,
        frozenRowsEnd: draftRowCount,
        frozenColsStart: model?.features.selection.enabled ? 1 : 0,
        frozenColsEnd: noActionColumn ? 0 : 1,
      };
    }, [model, draftRowCount]);

    const getCells = useCallback<NonNullable<GridContentProps['getCells']>>(
      (range: DxGridPlaneRange, plane: DxGridPlane) => presentation?.getCells(range, plane) ?? {},
      [presentation],
    );

    useEffect(() => {
      if (!presentation || !dxGrid) {
        return;
      }
      dxGrid.getCells = getCells;
    }, [presentation, dxGrid, getCells]);

    /**
     * Provides an external controller that can be called to repaint the table.
     */
    useImperativeHandle<TableController, TableController>(forwardedRef, () => {
      if (!presentation || !dxGrid) {
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
      };
    }, [presentation, dxGrid]);

    const handleSaveDraftRow = useCallback(
      (rowIndex = 0, insertAgain = false) => {
        if (model && dxGrid) {
          const didCommitSuccessfully = model.commitDraftRow(rowIndex);
          if (didCommitSuccessfully) {
            if (insertAgain) {
              model.insertRow();
              requestAnimationFrame(() => {
                dxGrid.setFocus({ plane: 'frozenRowsEnd', col: 0, row: 0 });
              });
            } else {
              requestAnimationFrame(() => {
                dxGrid.scrollToEndRow();
              });
            }
          }
        }
      },
      [model, dxGrid],
    );

    const handleGridClick = useCallback(
      (event: MouseEvent) => {
        const rowIndex = safeParseInt((event.target as HTMLElement).closest('[aria-rowindex]')?.ariaRowIndex ?? '');
        if (rowIndex != null) {
          if (onRowClick) {
            const row = model?.getRowAt(rowIndex);
            row && onRowClick(row);
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
              model?.sorting?.toggleSort(data.fieldId);
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
      (increment, delta) => {
        if (dxGrid) {
          dxGrid.refocus(increment, delta);
        }
      },
      [dxGrid],
    );

    const handleEnter = useCallback<NonNullable<TableCellEditorProps['onEnter']>>(
      (cell) => {
        if (!model?.features.dataEditable) {
          return;
        }

        if (model && dxGrid) {
          if (cell.plane === 'grid' && cell.row >= model.getRowCount() - 1) {
            if (draftRowCount < 1) {
              model.insertRow();
            }
            requestAnimationFrame(() => {
              dxGrid.setFocus({ plane: 'frozenRowsEnd', col: 0, row: 0 });
            });
          } else if (cell.plane === 'frozenRowsEnd') {
            handleSaveDraftRow(cell.row, true);
          }
        }
      },
      [model, dxGrid, draftRowCount],
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

        switch (event.key) {
          case 'Backspace':
          case 'Delete': {
            try {
              model.setCellData(cell, undefined);
              event.preventDefault();
            } catch {
              // Delete results in a validation error; don’t prevent default so dx-grid can emit an edit request.
            }
            break;
          }
        }
      },
      [model],
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

    // TODO(burdon): Factor out?
    // TODO(burdon): Generalize to handle other value types (e.g., enums).
    const handleQuery = useCallback<NonNullable<TableCellEditorProps['onQuery']>>(
      async ({ field, props }, text) => {
        if (model && props.referenceSchema && field.referencePath) {
          const space = getSpace(model.view);
          invariant(space);

          let schema;
          if (client) {
            schema = client.graph.schemaRegistry.getSchema(props.referenceSchema);
          }
          if (!schema) {
            schema = space.db.schemaRegistry.getSchema(props.referenceSchema);
          }

          if (schema) {
            const { objects } = await space.db.query(Filter.type(schema)).run();
            const options = objects
              .map((obj) => {
                const value = getValue(obj, field.referencePath!);
                if (!value || typeof value !== 'string') {
                  return undefined;
                }

                return {
                  label: value,
                  data: obj,
                };
              })
              .filter(isNotFalsy);

            return [
              ...options,
              {
                label: t('create new object label', { text }),
                data: createOption(text),
              },
            ];
          }
        }

        return [];
      },
      [model, client, t],
    );

    const handleSave = useCallback(() => {
      dxGrid?.updateCells(true);
    }, [dxGrid]);

    if (!model || !modals) {
      return <span role='none' className='attention-surface' />;
    }

    return (
      <Grid.Root id={model.id ?? 'table-grid'}>
        <TableValueEditor
          model={model}
          modals={modals}
          schema={schema}
          onEnter={handleEnter}
          onFocus={handleFocus}
          onQuery={handleQuery}
          onSave={handleSave}
        />
        <Grid.Content
          className={mx('[--dx-grid-base:var(--baseSurface)]', gridSeparatorInlineEnd, gridSeparatorBlockEnd)}
          frozen={frozen}
          columns={model.columnMeta.value}
          limitRows={model.getRowCount() ?? 0}
          limitColumns={model.projection.fields.length}
          overscroll='trap'
          onAxisResize={handleAxisResize}
          onClick={handleGridClick}
          onKeyDownCapture={handleKeyDown}
          onWheelCapture={handleWheel}
          ref={setDxGrid}
        />
        <RowActionsMenu model={model} modals={modals} />
        <ColumnActionsMenu model={model} modals={modals} />
        <ColumnSettings model={model} modals={modals} onNewColumn={handleNewColumn} />
        <CreateRefPanel model={model} modals={modals} />
      </Grid.Root>
    );
  },
);

export const Table = {
  Root: TableRoot,
  Main: TableMain,
};
