//
// Copyright 2025 DXOS.org
//

import type * as Schema from 'effect/Schema';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Entity, type Type } from '@dxos/echo';
import { Ref, getValue } from '@dxos/echo/internal';
import { invariant } from '@dxos/invariant';
import { type Label, Popover } from '@dxos/react-ui';
import { Form, type FormRootProps, type RefFieldProps } from '@dxos/react-ui-form';
import { parseCellIndex, useGridContext } from '@dxos/react-ui-grid';
import { type FieldProjection } from '@dxos/schema';
import { getDeep, isTruthy, setDeep } from '@dxos/util';

import { type ModalController, type TableModel, type TableRow } from '../../model';
import { translationKey } from '../../translations';
import { narrowSchema } from '../../util';

const createOptionLabel: Label = ['create new object label', { ns: translationKey }];

export type OnCreateHandler = (schema: Type.Entity.Any, values: any) => Parameters<typeof Ref.make>[0];

export type FormCellEditorProps<T extends Type.Entity.Any = Type.Entity.Any> = {
  __gridScope: any;
  schema?: T;
  model?: TableModel;
  fieldProjection: FieldProjection;
  modals?: ModalController; // TODO(burdon): Not used. Remove?
  onSave?: () => void;
  onCreate?: OnCreateHandler;
} & Omit<FormRootProps<any>, 'values' | 'schema' | 'onCreate'>;

export const FormCellEditor = <T extends Type.Entity.Any = Type.Entity.Any>({
  __gridScope,
  schema,
  model,
  fieldProjection,
  onSave,
  onCreate,
  ...formProps
}: FormCellEditorProps<T>) => {
  const anchorRef = useRef<HTMLButtonElement | null>(null);
  const { id: _gridId, editing: contextEditing, setEditing } = useGridContext('ArrayEditor', __gridScope);
  const [editing, setLocalEditing] = useState(false);

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

  const narrowedSchema = useMemo<Schema.Schema.AnyNoContext | undefined>(() => {
    if (!schema) {
      return undefined;
    }

    return narrowSchema(schema, [fieldProjection.field.path]);
  }, [JSON.stringify(schema), fieldProjection.field.path]); // TODO(burdon): Avoid stringify.

  const originalRow = useMemo<TableRow | undefined>(() => {
    if (model && contextEditing) {
      // Check if this is a draft cell and get the appropriate row data
      const cell = parseCellIndex(contextEditing.index);
      if (model.isDraftCell(cell)) {
        const draftRow = model.getDraftRows()[cell.row];
        invariant(draftRow);
        return draftRow.data;
      } else {
        const row = model.getRowAt(cell.row);
        invariant(row);
        return row;
      }
    }

    return undefined;
  }, [model, contextEditing]);

  // NOTE: Important to get a mutable deep clone to eject from the echo object.
  // TODO(wittjosiah): Consider using something like Obj.clone for this use case.
  const initialFormValues = useMemo(() => (originalRow ? JSON.parse(JSON.stringify(originalRow)) : {}), [originalRow]);
  const [formValues, setFormValues] = useState<any>(initialFormValues);

  const handleValuesChanged = useCallback<NonNullable<FormRootProps<any>['onValuesChanged']>>((values) => {
    setFormValues(values);
  }, []);
  const handleOpenChange = useCallback((nextOpen: boolean) => {
    if (nextOpen === false) {
      setEditing(null);
      onSave?.();
    }
    setLocalEditing(nextOpen);
  }, []);

  const handleSave = useCallback<NonNullable<FormRootProps<any>['onSave']>>(
    (values) => {
      if (!originalRow) {
        return;
      }
      const path = fieldProjection.field.path;
      const value = getDeep(values, [path]);
      // Use model's changeRow for consistent mutation handling.
      if (model) {
        model.changeRow(originalRow, (mutableRow) => {
          setDeep(mutableRow, [path], value);
        });
      } else {
        setDeep(originalRow, [path], value);
      }
      contextEditing?.cellElement?.focus();
      setEditing(null);
      setLocalEditing(false);
      onSave?.();
    },
    [fieldProjection.field.path, onSave, contextEditing, originalRow, model],
  );

  const handleCreate = useCallback<NonNullable<FormRootProps<any>['onCreate']>>(
    (schema, values) => {
      const objectWithId = onCreate?.(schema, values);
      if (objectWithId && originalRow) {
        const ref = Ref.make(objectWithId);
        const path = fieldProjection.field.path;
        // Use model's changeRow for consistent mutation handling.
        if (model) {
          model.changeRow(originalRow, (mutableRow) => {
            setDeep(mutableRow, [path], ref);
          });
        } else {
          setDeep(originalRow, [path], ref);
        }
      }
      contextEditing?.cellElement?.focus();
      setEditing(null);
      setLocalEditing(false);
      onSave?.();
    },
    [fieldProjection.field.path, onSave, contextEditing, originalRow, onCreate, model],
  );

  const getOptions = useCallback<NonNullable<RefFieldProps['getOptions']>>(
    (results) =>
      results
        .map((obj) => {
          return {
            id: Entity.getDXN(obj).toString(),
            label: getValue(obj, fieldProjection.field.referencePath!) || obj.id.toString(),
          };
        })
        .filter(isTruthy),
    [fieldProjection],
  );

  if (!editing) {
    return null;
  }

  return (
    <Popover.Root open={editing} onOpenChange={handleOpenChange}>
      <Popover.VirtualTrigger virtualRef={anchorRef} />
      <Popover.Portal>
        <Popover.Content tabIndex={-1} classNames='dx-card-popover-width dx-density-fine'>
          <Popover.Arrow />
          <Popover.Viewport>
            <Form.Root
              {...formProps}
              autoFocus
              schema={narrowedSchema}
              values={formValues}
              onValuesChanged={handleValuesChanged}
              projection={model?.projection}
              createInitialValuePath={fieldProjection.field.referencePath}
              createOptionIcon='ph--plus--regular'
              createOptionLabel={createOptionLabel}
              db={model?.db}
              getOptions={getOptions}
              onCreate={handleCreate}
              onSave={handleSave}
            >
              <Form.Viewport>
                <Form.Content>
                  <Form.FieldSet />
                  <Form.Actions />
                </Form.Content>
              </Form.Viewport>
            </Form.Root>
          </Popover.Viewport>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
};
