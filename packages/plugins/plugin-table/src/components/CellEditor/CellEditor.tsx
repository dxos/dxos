//
// Copyright 2024 DXOS.org
//

import { autocompletion, type CompletionContext, type CompletionResult } from '@codemirror/autocomplete';
import { EditorView } from '@codemirror/view';
import React, { useCallback, useMemo } from 'react';

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

import { type TableModel } from '../../model';
import { type GridCell, toGridCell } from '../../types';

export type CellEditorProps = {
  editing?: GridEditing;
  model?: TableModel;
  onEnter?: (cell: GridCell) => void;
  // TODO(burdon): Import types (and reuse throughout file).
  onFocus?: (increment: 'col' | 'row' | undefined, delta: 0 | 1 | -1 | undefined) => void;

  // TODO(burdon): Type.
  onComplete?: (field: FieldProjection, text: string) => Promise<{ label: string }[]>;
};

export const CellEditor = ({ editing, model, onEnter, onFocus, onComplete }: CellEditorProps) => {
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

  const handleClose = useCallback<NonNullable<EditorKeysProps['onClose']> | NonNullable<EditorKeysProps['onNav']>>(
    (value, event) => {
      invariant(model);
      invariant(editing);
      if (value !== undefined) {
        model.setCellData(toGridCell(editing.index), value);
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
    const { property } = model.projection.view.fields[col];
    const fieldProjection = model.projection.getFieldProjection(property);
    invariant(fieldProjection);

    if (onComplete) {
      switch (fieldProjection.props.format) {
        // TODO(burdon): Remove default.
        case FormatEnum.Ref:
        default: {
          extension.push([
            EditorView.theme({
              '.cm-completionDialog': {
                width: 'var(--dx-gridCellWidth)',
              },
            }),

            // TODO(burdon): Select value.
            // https://codemirror.net/docs/ref/#autocomplete.autocompletion
            autocompletion({
              activateOnTyping: true,
              closeOnBlur: false, // TODO(burdon): Cancel.
              tooltipClass: () => 'cm-completionDialog',
              override: [
                async (context: CompletionContext): Promise<CompletionResult> => {
                  const text = context.state.doc.toString();
                  return {
                    from: 0,
                    options: await onComplete(fieldProjection, text),
                  };
                },
              ],
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
