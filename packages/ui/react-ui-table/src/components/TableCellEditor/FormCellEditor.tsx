//
// Copyright 2025 DXOS.org
//

import { type Scope } from '@radix-ui/react-context';
import { type Schema } from 'effect';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';

import { getSnapshot } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { Popover, type PopoverRootProps, useDeepCompareMemo } from '@dxos/react-ui';
import { Form, type FormProps } from '@dxos/react-ui-form';
import { parseCellIndex, useGridContext } from '@dxos/react-ui-grid';
import { type FieldProjection } from '@dxos/schema';
import { getDeep, setDeep } from '@dxos/util';

import { type TableModel } from '../../model';
import { narrowSchema } from '../../util';

type FormCellEditorProps = {
  model?: TableModel;
  schema?: Schema.Schema.AnyNoContext;
  fieldProjection: FieldProjection;
  __gridScope: Scope;
};

export const FormCellEditor = ({ model, schema, fieldProjection, __gridScope }: FormCellEditorProps) => {
  const cellRef = useRef<HTMLButtonElement | null>(null);

  const { editing, setEditing } = useGridContext('ArrayEditor', __gridScope);
  useEffect(() => {
    if (editing && editing.cellElement) {
      cellRef.current = editing.cellElement as HTMLButtonElement;
    }
  }, [editing?.cellElement]);

  const narrowedSchema = useDeepCompareMemo<Schema.Schema.AnyNoContext | undefined>(() => {
    if (!schema) {
      return undefined;
    }

    return narrowSchema(schema, [fieldProjection.field.path]);
  }, [schema, fieldProjection.field.path]);

  const originalRow = useMemo(() => {
    if (model && editing) {
      const cell = parseCellIndex(editing.index);
      const row = model.getRowAt(cell.row);
      invariant(row);

      return row;
    }

    return undefined;
  }, [model, editing]);

  // NOTE(ZaymonFC): Important to get a snapshot to eject from the live object.
  const formValues = useMemo(() => {
    if (originalRow) {
      return getSnapshot(originalRow);
    }
  }, [originalRow]);

  const handleSave = useCallback<NonNullable<FormProps<any>['onSave']>>(
    (values) => {
      const path = fieldProjection.field.path;
      const value = getDeep(values, [path]);
      setDeep(originalRow, [path], value);
      setEditing(null);
    },
    [fieldProjection.field.path, originalRow],
  );

  const handleOpenChange = useCallback<NonNullable<PopoverRootProps['onOpenChange']>>(
    (nextOpen) => {
      if (nextOpen === false) {
        setEditing(null);
      }
    },
    [setEditing],
  );

  if (!narrowedSchema || !editing) {
    return null;
  }

  return (
    <Popover.Root open={editing !== null} onOpenChange={handleOpenChange}>
      <Popover.VirtualTrigger virtualRef={cellRef} />
      <Popover.Content tabIndex={-1} classNames='popover-card-width'>
        <Popover.Arrow />
        <Popover.Viewport>
          <Form schema={narrowedSchema} values={formValues} onSave={handleSave} />
        </Popover.Viewport>
      </Popover.Content>
    </Popover.Root>
  );
};
