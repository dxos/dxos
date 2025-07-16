//
// Copyright 2025 DXOS.org
//

import { type Schema } from 'effect';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { getSnapshot } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { Popover } from '@dxos/react-ui';
import { Form } from '@dxos/react-ui-form';
import { parseCellIndex, useGridContext } from '@dxos/react-ui-grid';
import { type FieldProjection } from '@dxos/schema';
import { getDeep, setDeep } from '@dxos/util';

import { type TableModel } from '../../model';
import { narrowSchema } from '../../util';

type FormCellEditorProps = {
  fieldProjection: FieldProjection;
  model?: TableModel;
  schema?: Schema.Schema.AnyNoContext;
  onSave?: () => void;
  __gridScope: any;
};

export const FormCellEditor = ({ fieldProjection, model, schema, onSave, __gridScope }: FormCellEditorProps) => {
  const { editing: contextEditing, setEditing } = useGridContext('ArrayEditor', __gridScope);
  const [editing, setLocalEditing] = useState(false);
  const anchorRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (contextEditing && contextEditing.cellElement) {
      anchorRef.current = (contextEditing.cellElement as HTMLElement).querySelector(
        '.dx-grid__cell__content',
      ) as HTMLButtonElement;
      setLocalEditing(true);
    } else {
      anchorRef.current = null;
      setLocalEditing(false);
    }
  }, [contextEditing]);

  const narrowedSchema = useMemo(() => {
    if (!schema) {
      return undefined;
    }
    return narrowSchema(schema, [fieldProjection.field.path]);
  }, [JSON.stringify(schema), fieldProjection.field.path]); // TODO(burdon): Avoid stringify.

  const originalRow = useMemo(() => {
    if (model && contextEditing) {
      const cell = parseCellIndex(contextEditing.index);
      const row = model.getRowAt(cell.row);
      invariant(row);

      return row;
    }

    return undefined;
  }, [model, contextEditing]);

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
      setLocalEditing(false);
      onSave?.();
    },
    [fieldProjection.field.path, originalRow],
  );

  const handleOpenChange = useCallback((nextOpen: boolean) => {
    if (nextOpen === false) {
      setEditing(null);
      onSave?.();
    }
    setLocalEditing(nextOpen);
  }, []);

  if (!editing) {
    return null;
  }

  return (
    <Popover.Root open={editing} onOpenChange={handleOpenChange}>
      <Popover.VirtualTrigger virtualRef={anchorRef} />
      <Popover.Content tabIndex={-1} classNames='popover-card-width density-fine'>
        <Popover.Arrow />
        <Popover.Viewport>
          <Form values={formValues} schema={narrowedSchema as any} onSave={handleSave} />
        </Popover.Viewport>
      </Popover.Content>
    </Popover.Root>
  );
};
