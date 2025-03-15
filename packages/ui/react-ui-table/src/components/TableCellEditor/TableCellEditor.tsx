//
// Copyright 2024 DXOS.org
//

import { type Completion } from '@codemirror/autocomplete';
import React, { useCallback, useMemo, useRef } from 'react';

import { FormatEnum } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { type DxGrid } from '@dxos/lit-grid';
import {
  cellQuery,
  editorKeys,
  parseCellIndex,
  useGridContext,
  type DxGridPlanePosition,
  type EditorKeyEvent,
  type EditorKeyOrBlurHandler,
  type EditorBlurHandler,
  GridCellEditor,
  type GridCellEditorProps,
  type GridScopedProps,
} from '@dxos/react-ui-grid';
import { type FieldProjection } from '@dxos/schema';

import { completion } from './extension';
import { type TableModel, type ModalController } from '../../model';

const newValue = Symbol.for('newValue');

/**
 * Option to create new object/value.
 */
export const createOption = (text: string) => ({ [newValue]: true, text });

const isCreateOption = (data: any) => typeof data === 'object' && data[newValue];

export type QueryResult = Pick<Completion, 'label'> & { data: any };

export type TableCellEditorProps = {
  model?: TableModel;
  modals?: ModalController;
  onEnter?: (cell: DxGridPlanePosition) => void;
  onFocus?: DxGrid['refocus'];
  onQuery?: (field: FieldProjection, text: string) => Promise<QueryResult[]>;
};

export const TableCellEditor = ({
  model,
  modals,
  onEnter,
  onFocus,
  onQuery,
  __gridScope,
}: GridScopedProps<TableCellEditorProps>) => {
  const { id: gridId, editing, setEditing } = useGridContext('TableCellEditor', __gridScope);
  const suppressNextBlur = useRef(false);

  const fieldProjection = useMemo<FieldProjection | undefined>(() => {
    if (!model || !editing) {
      return;
    }

    const { col } = parseCellIndex(editing.index);
    const field = model.projection.view.fields[col];
    const fieldProjection = model.projection.getFieldProjection(field.id);
    invariant(fieldProjection);
    return fieldProjection;
  }, [model, editing]);

  const handleEnter = useCallback(
    (value: any) => {
      if (!model || !editing) {
        return;
      }

      const cell = parseCellIndex(editing.index);
      model.setCellData(cell, value);
      onEnter?.(cell);
      onFocus?.();
      setEditing(null);
    },
    [model, editing],
  );

  const handleBlur = useCallback<EditorBlurHandler>(
    (value) => {
      if (!model || !editing) {
        return;
      }
      if (suppressNextBlur.current) {
        suppressNextBlur.current = false;
        return;
      }

      const cell = parseCellIndex(editing.index);
      if (value !== undefined) {
        model.setCellData(cell, value);
      }
    },
    [model, editing],
  );

  const handleClose = useCallback<EditorKeyOrBlurHandler>(
    (value, event) => {
      if (!model || !editing || !fieldProjection) {
        return;
      }

      const cell = parseCellIndex(editing.index);
      onEnter?.(cell);
      if (event && onFocus) {
        onFocus(determineNavigationAxis(event), determineNavigationDelta(event));
      }
    },
    [model, editing, onFocus, onEnter, fieldProjection, determineNavigationAxis, determineNavigationDelta],
  );

  const extension = useMemo(() => {
    if (!fieldProjection) {
      return [];
    }

    const extension = [
      editorKeys({
        onClose: handleClose,
        ...(editing?.initialContent && { onNav: handleClose }),
      }),
    ];

    if (onQuery) {
      switch (fieldProjection.props.format) {
        case FormatEnum.Ref: {
          extension.push([
            completion({
              onQuery: (text) => onQuery(fieldProjection, text),
              onMatch: (data) => {
                if (model && editing && modals) {
                  if (isCreateOption(data)) {
                    const { field, props } = fieldProjection;
                    if (props.referenceSchema) {
                      suppressNextBlur.current = true;
                      modals.openCreateRef(
                        props.referenceSchema,
                        document.querySelector(cellQuery(editing.index, gridId)),
                        {
                          [field.referencePath!]: data.text,
                        },
                        (data) => {
                          handleEnter(data);
                        },
                      );
                    }
                  } else {
                    handleEnter(data);
                  }
                }
              },
            }),
          ]);
          break;
        }
      }
    }

    return extension;
  }, [model, modals, editing, fieldProjection, handleClose]);

  const getCellContent = useCallback<GridCellEditorProps['getCellContent']>(() => {
    if (model && editing) {
      const value = model.getCellData(parseCellIndex(editing.index));
      return value !== undefined ? String(value) : '';
    }
  }, [model, editing]);

  return <GridCellEditor extension={extension} getCellContent={getCellContent} onBlur={handleBlur} />;
};

const determineNavigationAxis = ({ key }: EditorKeyEvent): 'col' | 'row' | undefined => {
  switch (key) {
    case 'ArrowUp':
    case 'ArrowDown':
    case 'Enter': {
      return 'row';
    }

    case 'ArrowLeft':
    case 'ArrowRight':
    case 'Tab':
      return 'col';
  }
};

const determineNavigationDelta = ({ key, shift }: EditorKeyEvent): -1 | 1 => {
  switch (key) {
    case 'ArrowUp':
    case 'ArrowLeft':
      return -1;

    case 'ArrowDown':
    case 'ArrowRight':
      return 1;
  }

  return shift ? -1 : 1;
};
