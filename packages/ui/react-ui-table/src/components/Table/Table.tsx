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
  useImperativeHandle,
  useState,
  useMemo,
  useEffect,
} from 'react';

import { type Client } from '@dxos/client';
import { getValue } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { Filter } from '@dxos/react-client/echo';
import { useTranslation } from '@dxos/react-ui';
import { useAttention } from '@dxos/react-ui-attention';
import {
  closestCell,
  type DxGridElement,
  type DxGridPosition,
  type GridContentProps,
  Grid,
  type DxGridPlane,
  type DxGridPlaneRange,
  gridSeparatorInlineEnd,
  gridSeparatorBlockEnd,
} from '@dxos/react-ui-grid';
import { mx } from '@dxos/react-ui-theme';
import { isNotFalsy, safeParseInt } from '@dxos/util';

import { ColumnActionsMenu } from './ColumnActionsMenu';
import { ColumnSettings } from './ColumnSettings';
import { CreateRefPanel } from './CreateRefPanel';
import { RowActionsMenu } from './RowActionsMenu';
import { ModalController, type TableModel, type TablePresentation } from '../../model';
import { translationKey } from '../../translations';
import { tableButtons, tableControls } from '../../util';
import { createOption, TableValueEditor, type TableCellEditorProps } from '../TableCellEditor';

//
// Table.Root
//

export type TableRootProps = PropsWithChildren<{ role?: string }>;

const TableRoot = ({ children, role }: TableRootProps) => {
  return (
    <div
      role='none'
      className={mx(
        'relative !border-separator',
        role === 'section' // TODO(burdon): This leaks composer plugin concepts? Standardize for react-ui?
          ? 'attention-surface overflow-hidden [&_.dx-grid]:max-is-[--dx-grid-content-inline-size]'
          : 'flex flex-col [&_.dx-grid]:grow [&_.dx-grid]:max-is-[--dx-grid-content-inline-size] [&_.dx-grid]:bs-0 [&_.dx-grid]:max-bs-[--dx-grid-content-block-size]',
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
            dxGrid.updateIfWithinBounds(cell);
          } else {
            dxGrid.updateCells(true);
            dxGrid.requestUpdate();
          }
        },
      };
    }, [presentation, dxGrid]);

    const handleGridClick = useCallback(
      (event: MouseEvent) => {
        const rowIndex = safeParseInt((event.target as HTMLElement).ariaRowIndex ?? '');
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
              if (model) {
                const didCommitSuccessfully = model.commitDraftRow(data.rowIndex);
                if (dxGrid && didCommitSuccessfully) {
                  requestAnimationFrame(() => {
                    dxGrid.scrollToEndRow();
                  });
                }
              }
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

        // TODO(burdon): Insert row only if bottom row isn't completely blank already.
        if (model && cell.row === model.getRowCount() - 1) {
          model.insertRow();
          if (dxGrid) {
            requestAnimationFrame(() => {
              dxGrid?.scrollToRow(cell.row + 1);
              dxGrid?.refocus('row', 1);
            });
          }
        }
      },
      [model, dxGrid],
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
            model.setCellData(cell, undefined);
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
          const space = model.space;
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
        />
        <Grid.Content
          className={mx('[--dx-grid-base:var(--baseSurface)]', gridSeparatorInlineEnd, gridSeparatorBlockEnd)}
          frozen={frozen}
          columns={model.columnMeta.value}
          limitRows={model.getRowCount() ?? 0}
          limitColumns={model.view?.fields?.length ?? 0}
          overscroll='trap'
          onAxisResize={handleAxisResize}
          onClick={handleGridClick}
          onKeyDown={handleKeyDown}
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
