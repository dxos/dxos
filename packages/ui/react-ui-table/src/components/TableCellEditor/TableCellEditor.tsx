//
// Copyright 2025 DXOS.org
//

import { type Completion } from '@codemirror/autocomplete';
import { EditorView } from '@codemirror/view';
import type * as Schema from 'effect/Schema';
import React, { useCallback, useMemo, useRef, useState } from 'react';

import { debounce } from '@dxos/async';
import { type Client } from '@dxos/client';
import { Format, TypeEnum } from '@dxos/echo/internal';
import { invariant } from '@dxos/invariant';
import { type DxGridAxis, type DxGridPosition } from '@dxos/lit-grid';
import {
  type EditorBlurHandler,
  type EditorKeyEvent,
  type EditorKeyOrBlurHandler,
  GridCellEditor,
  type GridCellEditorProps,
  type GridScopedProps,
  editorKeys,
  parseCellIndex,
  useGridContext,
} from '@dxos/react-ui-grid';
import { type FieldProjection, adaptValidationMessage } from '@dxos/schema';

import { type ModalController, type TableModel } from '../../model';

import { CellValidationMessage } from './CellValidationMessage';
import { FormCellEditor, type OnCreateHandler } from './FormCellEditor';

/**
 * Option to create new object/value.
 */
export type QueryResult = Pick<Completion, 'label'> & { data: any };

export type TableCellEditorProps = {
  model?: TableModel;
  modals?: ModalController;
  schema?: Schema.Schema.AnyNoContext;
  onFocus?: (axis?: DxGridAxis, delta?: -1 | 0 | 1, cell?: DxGridPosition) => void;
  onCreate?: OnCreateHandler;
  onSave?: () => void;
  client?: Client;
};

export const TableValueEditor = ({
  model,
  modals,
  schema,
  onFocus,
  onSave,
  onCreate,
  client,
  __gridScope,
}: GridScopedProps<TableCellEditorProps>) => {
  const { editing } = useGridContext('TableValueEditor', __gridScope);

  const fieldProjection = useMemo<FieldProjection | undefined>(() => {
    if (!model || !editing) {
      return;
    }

    const { col } = parseCellIndex(editing.index);
    const field = model.projection.fields[col];
    const fieldProjection = model.projection.getFieldProjection(field.id);
    invariant(fieldProjection);
    return fieldProjection;
  }, [model, editing]);

  if (
    fieldProjection?.props.type === TypeEnum.Array ||
    fieldProjection?.props.format === Format.TypeFormat.SingleSelect ||
    fieldProjection?.props.format === Format.TypeFormat.Ref
    // TODO(thure): Support `Format.TypeFormat.MultiSelect`
  ) {
    return (
      <FormCellEditor
        fieldProjection={fieldProjection}
        model={model}
        schema={schema}
        __gridScope={__gridScope}
        onSave={onSave}
        onCreate={onCreate}
        client={client}
        modals={modals}
      />
    );
  }

  // For all other types, use the existing cell editor
  return <TableCellEditor model={model} modals={modals} onFocus={onFocus} onSave={onSave} __gridScope={__gridScope} />;
};

const editorSlots = { scroll: { className: '!plb-[--dx-grid-cell-editor-padding-block]' } };

export const TableCellEditor = ({
  model,
  modals,
  onFocus,
  onSave,
  __gridScope,
}: GridScopedProps<TableCellEditorProps>) => {
  const { editing, setEditing } = useGridContext('TableCellEditor', __gridScope);
  const suppressNextBlur = useRef(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [validationVariant, setValidationVariant] = useState<'error' | 'warning'>('error');

  const fieldProjection = useMemo<FieldProjection | undefined>(() => {
    if (!model || !editing) {
      return;
    }

    const { col } = parseCellIndex(editing.index);
    const field = model.projection.fields[col];
    const fieldProjection = model.projection.getFieldProjection(field.id);
    invariant(fieldProjection);
    return fieldProjection;
  }, [model, editing]);

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
        onFocus?.();
        setEditing(null);
        onSave?.();
      } else {
        setValidationError(adaptValidationMessage(validationResult.error));
        setValidationVariant('error');
      }
    },
    [model, editing, onFocus, setEditing],
  );

  const handleBlur = useCallback<EditorBlurHandler>(
    async (value) => {
      if (suppressNextBlur.current) {
        suppressNextBlur.current = false;
      } else if (model && editing) {
        // Save silently if validation passes
        const cell = parseCellIndex(editing.index);
        if (value !== undefined) {
          const result = await model.validateCellData(cell, value);
          if (result.valid) {
            setValidationError(null);
            model.setCellData(cell, value);
            setEditing(null);
            onSave?.();
          }
        }
      }
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
          suppressNextBlur.current = true;
          setValidationError(null);
          model.setCellData(cell, value);
          setEditing(null);
          onSave?.();
          if (event && onFocus) {
            onFocus(determineNavigationAxis(event), determineNavigationDelta(event), cell);
          }
        } else {
          setValidationError(result.error);
          setValidationVariant('error');
        }
      } else {
        suppressNextBlur.current = true;
        setValidationError(null);
        setEditing(null);
        onSave?.();
        if (event && onFocus) {
          onFocus(determineNavigationAxis(event), determineNavigationDelta(event));
        }
      }
    },
    [model, editing, onFocus, fieldProjection, setEditing, onSave],
  );

  const extensions = useMemo(() => {
    if (!fieldProjection) {
      return [];
    }

    const extensions = [
      editorKeys({
        onClose: handleClose,
        ...(editing?.initialContent && { onNav: handleClose }),
      }),
    ];
    // Add validation extension to handle content changes.
    if (model && editing) {
      extensions.push(
        EditorView.updateListener.of(
          debounce((update) => {
            const content = update.state.doc.toString();
            const cell = parseCellIndex(editing.index);

            // Perform validation on content change.
            void model.validateCellData(cell, content).then((result) => {
              if (result.valid) {
                setValidationError(null);
              } else {
                setValidationError(result.error);
                setValidationVariant('error');
              }
            });
          }, 10),
        ),
      );
    }

    return extensions;
  }, [model, modals, editing, fieldProjection, handleClose]);

  const getCellContent = useCallback<GridCellEditorProps['getCellContent']>(() => {
    if (model && editing) {
      const cell = parseCellIndex(editing.index);
      const value = model.getCellData(cell);
      return value !== undefined ? String(value) : '';
    }
  }, [model, editing]);

  return (
    <>
      <CellValidationMessage validationError={validationError} variant={validationVariant} __gridScope={__gridScope} />
      <GridCellEditor extensions={extensions} getCellContent={getCellContent} onBlur={handleBlur} slots={editorSlots} />
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
