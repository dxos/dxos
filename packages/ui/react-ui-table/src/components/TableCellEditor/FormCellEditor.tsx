//
// Copyright 2025 DXOS.org
//

import { Schema } from 'effect';
import { isTypeLiteral, TypeLiteral } from 'effect/SchemaAST';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';

import { getSnapshot } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { Popover } from '@dxos/react-ui';
import { Form } from '@dxos/react-ui-form';
import { parseCellIndex, useGridContext } from '@dxos/react-ui-grid';
import { type FieldProjection } from '@dxos/schema';
import { getDeep, setDeep } from '@dxos/util';

import { type TableModel } from '../../model';

type FormCellEditorProps = {
  fieldProjection: FieldProjection;
  model?: TableModel;
  schema?: Schema.Schema.AnyNoContext;
  __gridScope: any;
};

export const FormCellEditor = ({ fieldProjection, model, schema, __gridScope }: FormCellEditorProps) => {
  const { editing, setEditing } = useGridContext('ArrayEditor', __gridScope);
  const cellRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (editing && editing.cellElement) {
      cellRef.current = editing.cellElement as HTMLButtonElement;
    }
  }, [editing?.cellElement]);

  /**
   * A narrowed schema from the original schema that only includes
   * the field being edited. This allows the Form component to only display
   * and edit / validate this specific field rather than the entire object.
   *
   * @returns A Schema instance containing only the property corresponding to the current field path
   */
  const narrowSchema = useMemo(() => {
    const ast = (schema as any)?.ast;
    if (isTypeLiteral(ast)) {
      const propertySignature = ast.propertySignatures.find(
        (signature) => signature.name === fieldProjection.field.path,
      );
      if (propertySignature) {
        const narrowType = new TypeLiteral([propertySignature], []);
        return Schema.make(narrowType);
      }
    }
  }, [JSON.stringify(schema), fieldProjection.field.path]);

  const originalRow = useMemo(() => {
    if (model && editing) {
      const cell = parseCellIndex(editing.index);
      const row = model.getRowAt(cell.row);
      invariant(row);

      return row;
    }

    return undefined;
  }, [model, editing]);

  const formValues = useMemo(() => {
    if (originalRow) {
      // NOTE(ZaymonFC): Important to get a snapshot to eject from the live object.
      return getSnapshot(originalRow);
    }
  }, [originalRow]);

  const handleSave = useCallback(
    (values: any) => {
      const path = fieldProjection.field.path;
      const value = getDeep(values, [path]);
      setDeep(originalRow, [path], value);
      setEditing(null);
    },
    [fieldProjection.field.path, originalRow],
  );

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (nextOpen === false) {
        setEditing(null);
      }
    },
    [setEditing],
  );

  if (!editing) {
    return null;
  }

  return (
    <Popover.Root open={editing !== null} onOpenChange={handleOpenChange}>
      <Popover.VirtualTrigger virtualRef={cellRef} />
      <Popover.Content tabIndex={-1} classNames='popover-consistent-width'>
        <Popover.Arrow />
        <Form values={formValues} schema={narrowSchema as any} onSave={handleSave} />
      </Popover.Content>
    </Popover.Root>
  );
};
