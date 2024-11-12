//
// Copyright 2024 DXOS.org
//

import React, { useCallback, useMemo, useRef } from 'react';

import { FormatEnum } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import {
  editorKeys,
  type EditorKeysProps,
  type EditorKeyEvent,
  GridCellEditor,
  type GridEditing,
} from '@dxos/react-ui-grid';
import { type FieldProjection } from '@dxos/schema';

import { completion } from './extension';
import { type TableModel } from '../../model';
import { type GridCell, toGridCell } from '../../types';

export type CellEditorProps = {
  editing?: GridEditing;
  model?: TableModel;
  onEnter?: (cell: GridCell) => void;
  // TODO(burdon): Import types (and reuse throughout file).
  onFocus?: (increment: 'col' | 'row' | undefined, delta: 0 | 1 | -1 | undefined) => void;
  onQuery?: (field: FieldProjection, text: string) => Promise<{ label: string; data: any }[]>;
};

export const CellEditor = ({ editing, model, onEnter, onFocus, onQuery }: CellEditorProps) => {
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

  // Selected object reference.
  const objectRef = useRef();

  const handleClose = useCallback<NonNullable<EditorKeysProps['onClose']> | NonNullable<EditorKeysProps['onNav']>>(
    (value, event) => {
      invariant(model);
      invariant(editing);
      if (value !== undefined) {
        // Set value or reference.
        model.setCellData(toGridCell(editing.index), objectRef.current ?? value);
      }

      const cell = toGridCell(editing.index);
      onEnter?.(cell);
      onFocus?.(determineNavigationAxis(event), determineNavigationDelta(event));
    },
    [model, editing, determineNavigationAxis, determineNavigationDelta],
  );

  const extension = useMemo(() => {
    if (!editing) {
      return [];
    }

    const extension = [
      editorKeys({
        onClose: handleClose,
        ...(editing?.initialContent && { onNav: handleClose }),
      }),
    ];

    invariant(model);
    const { col } = toGridCell(editing.index);
    const field = model.projection.view.fields[col];
    const fieldProjection = model.projection.getFieldProjection(field.id);
    invariant(fieldProjection);

    if (onQuery) {
      switch (fieldProjection.props.format) {
        case FormatEnum.Ref: {
          extension.push([
            completion({
              onQuery: (text) => onQuery(fieldProjection, text),
              onMatch: (data) => (objectRef.current = data),
            }),
          ]);
          break;
        }
      }
    }

    return extension;
  }, [model, editing, handleClose]);

  const getCellContent = useCallback(() => {
    if (model && editing) {
      const value = model.getCellData(toGridCell(editing.index));
      return value !== undefined ? String(value) : '';
    }
  }, [model, editing]);

  return <GridCellEditor extension={extension} getCellContent={getCellContent} />;
};
