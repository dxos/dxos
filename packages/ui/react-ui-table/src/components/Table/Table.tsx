//
// Copyright 2024 DXOS.org
//

import React, {
  forwardRef,
  type PropsWithChildren,
  useCallback,
  useImperativeHandle,
  useState,
  type WheelEvent,
  type MouseEvent,
  useMemo,
} from 'react';

import { getValue } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { Filter, getSpace, fullyQualifiedId } from '@dxos/react-client/echo';
import { useTranslation } from '@dxos/react-ui';
import { useAttention } from '@dxos/react-ui-attention';
import { type DxGridElement, Grid, type GridContentProps, closestCell, type DxGridPosition } from '@dxos/react-ui-grid';
import { mx } from '@dxos/react-ui-theme';
import { isNotFalsy } from '@dxos/util';

import { ColumnActionsMenu } from './ColumnActionsMenu';
import { ColumnSettings } from './ColumnSettings';
import { CreateRefPanel } from './CreateRefPanel';
import { RefPanel } from './RefPanel';
import { RowActionsMenu } from './RowActionsMenu';
import { ModalController, type TableModel, type TablePresentation } from '../../model';
import { translationKey } from '../../translations';
import { tableButtons, tableControls } from '../../util';
import { createOption, TableCellEditor, type TableCellEditorProps } from '../TableCellEditor';

// NOTE(Zan): These fragments add border to inline-end and block-end of the grid using pseudo-elements.
// These are offset by 1px to avoid double borders in planks.
const inlineEndLine =
  '[&>.dx-grid]:relative [&>.dx-grid]:after:absolute [&>.dx-grid]:after:inset-block-0 [&>.dx-grid]:after:-inline-end-px [&>.dx-grid]:after:is-px [&>.dx-grid]:after:bg-separator';
const blockEndLine =
  '[&>.dx-grid]:before:absolute [&>.dx-grid]:before:inset-inline-0 [&>.dx-grid]:before:-block-end-px [&>.dx-grid]:before:bs-px [&>.dx-grid]:before:bg-separator';

const frozen = { frozenRowsStart: 1, frozenColsStart: 1, frozenColsEnd: 1 };

//
// Root
//

export type TableRootProps = PropsWithChildren<{ role?: string }>;

const TableRoot = ({ children, role }: TableRootProps) => {
  return (
    <div
      role='none'
      className={mx(
        'relative border-bs !border-separator',
        role === 'section'
          ? 'attention-surface overflow-hidden [&_.dx-grid]:max-is-[--dx-grid-content-inline-size]'
          : 'flex flex-col [&_.dx-grid]:grow [&_.dx-grid]:max-is-[--dx-grid-content-inline-size] [&_.dx-grid]:bs-0 [&_.dx-grid]:max-bs-[--dx-grid-content-block-size]',
      )}
    >
      {children}
    </div>
  );
};

//
// Main
//

export type TableController = {
  update?: (cell?: DxGridPosition) => void;
};

export type TableMainProps = {
  model?: TableModel;
  presentation?: TablePresentation;
  ignoreAttention?: boolean;
};

const TableMain = forwardRef<TableController, TableMainProps>(
  ({ model, presentation, ignoreAttention }, forwardedRef) => {
    const [dxGrid, setDxGrid] = useState<DxGridElement | null>(null);
    const { hasAttention } = useAttention(model?.table ? fullyQualifiedId(model.table) : 'table');
    const { t } = useTranslation(translationKey);
    const modals = useMemo(() => new ModalController(), []);

    /**
     * Provides an external controller that can be called to repaint the table.
     */
    useImperativeHandle<TableController, TableController>(
      forwardedRef,
      () => {
        if (!presentation || !dxGrid) {
          return {};
        }

        dxGrid.getCells = presentation.getCells.bind(model);
        return {
          update: (cell) => {
            if (cell) {
              dxGrid.updateIfWithinBounds(cell);
            } else {
              dxGrid.updateCells(true);
            }
          },
        };
      },
      [presentation, dxGrid],
    );

    const handleGridClick = useCallback(
      (event: MouseEvent) => {
        if (!modals) {
          return;
        }

        const selector = Object.values(tableButtons)
          .map((button) => `button[${button.attr}]`)
          .join(',');

        const matchedElement = (event.target as HTMLElement).closest(selector) as HTMLElement;
        if (matchedElement) {
          const button = Object.values(tableButtons).find((btn) => matchedElement.hasAttribute(btn.attr));
          if (!button) {
            return;
          }

          modals.setTrigger(matchedElement);
          const data = button.getData(matchedElement);
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
            case 'referencedCell': {
              modals.showReferencePanel(data.targetId, data.schemaId);
              break;
            }
          }
          return;
        }

        const selectionCheckbox = (event.target as HTMLElement).closest(
          `input[${tableControls.checkbox.attributes.checkbox}]`,
        ) as HTMLElement | null;

        if (selectionCheckbox) {
          const isHeader = selectionCheckbox.hasAttribute(tableControls.checkbox.attributes.header);
          if (isHeader) {
            model?.selection.setSelection(model.selection.allRowsSeleted.value ? 'none' : 'all');
          } else {
            const rowIndex = Number(selectionCheckbox.getAttribute(tableControls.checkbox.attributes.checkbox));
            model?.selection.toggleSelectionForRowIndex(rowIndex);
          }
        }
      },
      [model, modals],
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
        // TODO(burdon): Insert row only if bottom row isn't completely blank already.
        if (model && cell.row === model.getRowCount() - 1) {
          model.insertRow(cell.row);
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
          const space = getSpace(model.table);
          invariant(space);
          const schema = space.db.schemaRegistry.getSchema(props.referenceSchema);
          if (schema) {
            const { objects } = await space.db.query(Filter.schema(schema)).run();
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
      [model],
    );

    if (!model || !modals) {
      return <span role='none' className='attention-surface' />;
    }

    return (
      <Grid.Root id={model.table.id ?? 'table-grid'}>
        <TableCellEditor
          model={model}
          modals={modals}
          onEnter={handleEnter}
          onFocus={handleFocus}
          onQuery={handleQuery}
        />
        <Grid.Content
          onWheelCapture={handleWheel}
          className={mx('[--dx-grid-base:var(--surface-bg)]', inlineEndLine, blockEndLine)}
          frozen={frozen}
          columns={model.columnMeta.value}
          limitRows={model.getRowCount() ?? 0}
          limitColumns={model.table.view?.target?.fields?.length ?? 0}
          onAxisResize={handleAxisResize}
          onClick={handleGridClick}
          onKeyDown={handleKeyDown}
          overscroll='trap'
          ref={setDxGrid}
        />
        <RowActionsMenu model={model} modals={modals} />
        <ColumnActionsMenu model={model} modals={modals} />
        <ColumnSettings model={model} modals={modals} onNewColumn={handleNewColumn} />
        <RefPanel model={model} modals={modals} />
        <CreateRefPanel model={model} modals={modals} />
      </Grid.Root>
    );
  },
);

//
// CellEditor
//

export const Table = {
  Root: TableRoot,
  Main: TableMain,
};
