//
// Copyright 2024 DXOS.org
//

import { autocompletion } from '@codemirror/autocomplete';
import React, { useCallback, useMemo } from 'react';

import { FormatEnum } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import {
  type EditorKeysProps,
  type EditorKeyEvent,
  GridCellEditor,
  type GridScopedProps,
  editorKeys,
  useGridContext,
} from '@dxos/react-ui-grid';

import { type TableModel } from '../../model';
import { type GridCell, toGridCell } from '../../types';

export type TableCellEditorProps = GridScopedProps<{
  model?: TableModel;
  onEnter?: (cell: GridCell) => void;
  // TODO(burdon): Import types (and reuse throughout file).
  onFocus?: (increment: 'col' | 'row' | undefined, delta: 0 | 1 | -1 | undefined) => void;
}>;

export const TableCellEditor = ({ __gridScope, model, onEnter, onFocus }: TableCellEditorProps) => {
  const { editing, setEditing } = useGridContext('GridSheetCellEditor', __gridScope);

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
      setEditing(null);
      onEnter?.(cell);

      onFocus?.(determineNavigationAxis(event), determineNavigationDelta(event));
    },
    [model, editing, setEditing, determineNavigationAxis, determineNavigationDelta],
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

    // TODO(burdon): Add autocomplete extension for references, enums, etc. based on type.
    // TODO(burdon): Factor out factory?
    invariant(model);
    const { col } = toGridCell(editing.index);
    const { property } = model.projection.view.fields[col];
    const fieldProjection = model.projection.getFieldProjection(property);
    invariant(fieldProjection);
    console.log(JSON.stringify(fieldProjection));

    // TODO(burdon): Separate unit test for editor.
    switch (fieldProjection.props.format) {
      case FormatEnum.Ref:
      default: {
        extension.push(
          // https://codemirror.net/docs/ref/#autocomplete.autocompletion
          autocompletion({
            activateOnTyping: true,
            closeOnBlur: false,
            override: [
              (context) => {
                return {
                  options: [
                    {
                      label: 'apple',
                    },
                    {
                      label: 'banana',
                    },
                    {
                      label: 'cherry',
                    },
                  ],
                };
              },
            ],
          }),
          // autocompletion({
          //   activateOnTyping: true,
          //   onSearch: (text: string) => {
          //     console.log(text);
          //     return [
          //       //
          //       { label: 'apple' },
          //       { label: 'banana' },
          //       { label: 'cherry' },
          //     ];
          //   },
          // }),
        );
        break;
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
