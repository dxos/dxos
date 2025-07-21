//
// Copyright 2025 DXOS.org
//

import { type Completion } from '@codemirror/autocomplete';
import { type Schema } from 'effect/Schema';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { FormatEnum, TypeEnum } from '@dxos/echo-schema';
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
import { tagPicker, createLinks } from '@dxos/react-ui-tag-picker';
import { type FieldProjection } from '@dxos/schema';

import { CellValidationMessage } from './CellValidationMessage';
import { FormCellEditor } from './FormCellEditor';
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
  schema?: Schema.AnyNoContext;
  onEnter?: (cell: DxGridPlanePosition) => void;
  onFocus?: DxGrid['refocus'];
  onQuery?: (field: FieldProjection, text: string) => Promise<QueryResult[]>;
};

export const TableValueEditor = ({
  model,
  modals,
  schema,
  onEnter,
  onFocus,
  onQuery,
  __gridScope,
}: GridScopedProps<TableCellEditorProps>) => {
  const { editing } = useGridContext('TableValueEditor', __gridScope);

  const fieldProjection = useMemo<FieldProjection | undefined>(() => {
    if (!model || !editing) {
      return;
    }

    const { col } = parseCellIndex(editing.index);
    const field = model.projectionManager.projection.fields[col];
    const fieldProjection = model.projectionManager.getFieldProjection(field.id);
    invariant(fieldProjection);
    return fieldProjection;
  }, [model, editing]);

  if (fieldProjection?.props.type === TypeEnum.Array) {
    return <FormCellEditor fieldProjection={fieldProjection} model={model} schema={schema} __gridScope={__gridScope} />;
  }

  // For all other types, use the existing cell editor
  return (
    <TableCellEditor
      model={model}
      modals={modals}
      onEnter={onEnter}
      onFocus={onFocus}
      onQuery={onQuery}
      __gridScope={__gridScope}
    />
  );
};

const editorSlots = { scroller: { className: '!plb-[--dx-grid-cell-editor-padding-block]' } };

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
  const [_validationError, setValidationError] = useState<string | null>(null);
  const [_validationVariant, setValidationVariant] = useState<'error' | 'warning'>('error');

  const fieldProjection = useMemo<FieldProjection | undefined>(() => {
    if (!model || !editing) {
      return;
    }

    const { col } = parseCellIndex(editing.index);
    const field = model.projectionManager.projection.fields[col];
    const fieldProjection = model.projectionManager.getFieldProjection(field.id);
    invariant(fieldProjection);
    return fieldProjection;
  }, [model, editing]);

  useEffect(() => {
    // Check for existing validation errors when editing starts (for draft rows).
    if (!model || !editing || !fieldProjection) {
      setValidationError(null);
      return;
    }

    const cell = parseCellIndex(editing.index);
    const { row, col } = cell;

    if (model.isDraftCell(cell)) {
      const field = model.projection.fields[col];
      const hasValidationError = model.hasDraftRowValidationError(row, field.path);

      if (hasValidationError) {
        const draftRows = model.draftRows.value;
        if (row >= 0 && row < draftRows.length) {
          const draftRow = draftRows[row];
          const validationError = draftRow.validationErrors?.find((error) => error.path === field.path);
          if (validationError) {
            setValidationError(validationError.message);
            setValidationVariant('warning');
          }
        }
      } else {
        setValidationError(null);
      }
    } else {
      setValidationError(null);
    }
  }, [model, editing, fieldProjection]);

  const handleEnter = useCallback(
    async (value: any) => {
      if (!model || !editing) {
        return;
      }

      const cell = parseCellIndex(editing.index);
      const validationResult = await model.validateCellData(cell, value);

      if (validationResult.valid) {
        setValidationError(null);
        model.setCellData(cell, value);
        onEnter?.(cell);
        onFocus?.();
        setEditing(null);
      } else {
        setValidationError(validationResult.error);
        setValidationVariant('error');
      }
    },
    [model, editing, onEnter, onFocus, setEditing],
  );

  const handleBlur = useCallback<EditorBlurHandler>(
    async (value) => {
      if (!model || !editing) {
        return;
      }
      if (suppressNextBlur.current) {
        suppressNextBlur.current = false;
      }

      // Don't save on blur - let handleClose handle validation and saving
    },
    [model, editing],
  );

  const handleClose = useCallback<EditorKeyOrBlurHandler>(
    async (value, event) => {
      if (!model || !editing || !fieldProjection) {
        return;
      }

      const cell = parseCellIndex(editing.index);

      if (value !== undefined) {
        // Pre-commit validation check.
        const result = await model.validateCellData(cell, value);

        if (result.valid) {
          setValidationError(null);
          model.setCellData(cell, value);
          setEditing(null);
          onEnter?.(cell);
          if (event && onFocus) {
            onFocus(determineNavigationAxis(event), determineNavigationDelta(event));
          }
        } else {
          setValidationError(result.error);
          setValidationVariant('error');
        }
      } else {
        setValidationError(null);
        setEditing(null);
        if (event && onFocus) {
          onFocus(determineNavigationAxis(event), determineNavigationDelta(event));
        }
      }
    },
    [model, editing, onFocus, onEnter, fieldProjection, setEditing],
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
        tagPicker({
          mode,
          keymap: false,
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
                void handleEnter(ids[0]);
              } else {
                void handleEnter(ids);
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
                          void handleEnter(data);
                        },
                      );
                    }
                  } else {
                    void handleEnter(data);
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
      const field = model.projectionManager.projection.fields[col];
      const fieldProjection = model.projectionManager.getFieldProjection(field.id);

      if (
        fieldProjection?.props.format === FormatEnum.SingleSelect ||
        fieldProjection?.props.format === FormatEnum.MultiSelect
      ) {
        const value = model.getCellData(cell);

        if (value !== undefined) {
          const options = fieldProjection.props.options || [];

          if (fieldProjection.props.format === FormatEnum.MultiSelect) {
            const tagItems = value
              .split(',')
              .map((id: string) => {
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
              .filter((item: any): item is { id: any; label: string; hue: any } => item !== undefined);

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

        return '';
      }

      const value = model.getCellData(cell);
      return value !== undefined ? String(value) : '';
    }
  }, [model, editing]);

  return (
    <>
      <CellValidationMessage
        validationError={_validationError}
        variant={_validationVariant}
        __gridScope={__gridScope}
      />
      <GridCellEditor extension={extension} getCellContent={getCellContent} onBlur={handleBlur} slots={editorSlots} />
    </>
  );
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
