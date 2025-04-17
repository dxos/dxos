//
// Copyright 2024 DXOS.org
//

import { type Completion } from '@codemirror/autocomplete';
import React, { useCallback, useMemo, useRef } from 'react';

import { FormatEnum } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { type DxGrid } from '@dxos/lit-grid';
import { useThemeContext } from '@dxos/react-ui';
import { createMarkdownExtensions } from '@dxos/react-ui-editor';
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
import { tagPickerExtension, createLinks } from '@dxos/react-ui-tag-picker';
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
  const { themeMode } = useThemeContext();

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
    [model, editing, onEnter, onFocus, setEditing],
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
    [model, editing, onFocus, onEnter, fieldProjection],
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

    const format = fieldProjection.props.format;

    if (format === FormatEnum.SingleSelect || format === FormatEnum.MultiSelect) {
      // TODO(ZaymonFC): Reconcile this with the TagPicker component?
      // Add markdown extensions needed by tag picker.
      extension.push(createMarkdownExtensions({ themeMode }));

      const options = fieldProjection.props.options || [];

      const mode = format === FormatEnum.SingleSelect ? ('single-select' as const) : ('multi-select' as const);

      extension.push(
        tagPickerExtension({
          mode,
          inGrid: true,
          onSearch: (text, selectedIds) => {
            return options
              .filter(
                (option) =>
                  selectedIds.indexOf(option.id) === -1 &&
                  (text.length === 0 || option.title.toLowerCase().includes(text.toLowerCase())),
              )
              .map((option) => ({
                id: option.id,
                label: option.title,
                hue: option.color as any,
              }));
          },
          onUpdate: (ids) => {
            if (model && editing) {
              if (ids.length === 0) {
                return;
              }
              if (mode === 'single-select') {
                handleEnter(ids[0]);
              } else {
                handleEnter(ids);
              }
            }
          },
        }),
      );
    }

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
  }, [model, modals, editing, fieldProjection, handleClose, themeMode]);

  const getCellContent = useCallback<GridCellEditorProps['getCellContent']>(() => {
    if (model && editing) {
      const cell = parseCellIndex(editing.index);
      const { col } = cell;
      const field = model.projection.view.fields[col];
      const fieldProjection = model.projection.getFieldProjection(field.id);

      if (
        fieldProjection?.props.format === FormatEnum.SingleSelect ||
        fieldProjection?.props.format === FormatEnum.MultiSelect
      ) {
        const value = model.getCellData(cell);

        if (value !== undefined) {
          const options = fieldProjection.props.options || [];

          if (fieldProjection.props.format === FormatEnum.MultiSelect && Array.isArray(value)) {
            const tagItems = value
              .map((id) => {
                const option = options.find((o) => o.id === id);
                if (option) {
                  return {
                    id,
                    label: option.title,
                    hue: option.color as any,
                  };
                }
                return undefined;
              })
              .filter((item): item is { id: any; label: string; hue: any } => item !== undefined);

            return createLinks(tagItems);
          } else {
            const option = options.find((o) => o.id === value);

            if (option) {
              const tagItem = {
                id: value,
                label: option.title,
                hue: option.color as any,
              };

              return createLinks([tagItem]);
            }
          }
        }

        // Return empty string if no value
        return '';
      }

      // Default behavior for other formats
      const value = model.getCellData(cell);
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
