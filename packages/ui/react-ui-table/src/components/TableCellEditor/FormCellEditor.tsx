//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Filter, Obj, type Type } from '@dxos/echo';
import { Format, Ref, getValue } from '@dxos/echo/internal';
import { invariant } from '@dxos/invariant';
import { getSnapshot } from '@dxos/live-object';
import { getSpace } from '@dxos/react-client/echo';
import { Popover } from '@dxos/react-ui';
import { Form, type FormProps } from '@dxos/react-ui-form';
import { parseCellIndex, useGridContext } from '@dxos/react-ui-grid';
import { type FieldProjection } from '@dxos/schema';
import { getDeep, isTruthy, setDeep } from '@dxos/util';

import { type ModalController, type TableModel, type TableRow } from '../../model';
import { translationKey } from '../../translations';
import { narrowSchema } from '../../util';

const createOptionLabel = ['create new object label', { ns: translationKey }] as [string, { ns: string }];

export type OnCreateHandler = (schema: Schema.Schema.AnyNoContext, values: any) => Parameters<typeof Ref.make>[0];

export type FormCellEditorProps<T extends Type.Entity.Any = Type.Entity.Any> = {
  __gridScope: any;
  schema?: T;
  model?: TableModel;
  fieldProjection: FieldProjection;
  modals?: ModalController; // TODO(burdon): Not used. Remove?
  onSave?: () => void;
  onCreate?: OnCreateHandler;
} & Omit<FormProps<any>, 'values' | 'schema' | 'onCreate'>;

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

  const getSchema = useCallback(
    ({ typename }: { typename: string }) => {
      const space = getSpace(model!.view);
      invariant(space);
      const schema = space.db.schemaRegistry.query({ typename, location: ['database', 'runtime'] }).runSync()[0];
      return { space, schema };
    },
    [model],
  );

  const refSchema = useMemo(() => {
    if (fieldProjection.props.format === Format.TypeFormat.Ref && fieldProjection.props.referenceSchema) {
      const { schema } = getSchema({ typename: fieldProjection.props.referenceSchema });
      return schema;
    }

    return null;
  }, [fieldProjection.props.format, fieldProjection.props.referenceSchema, getSchema]);

  // TODO(burdon): Factor out.
  const createSchema = useMemo(() => {
    return refSchema ? Schema.omit<any, any, ['id']>('id')(refSchema) : null;
  }, [refSchema]);

  const originalRow = useMemo<TableRow | undefined>(() => {
    if (model && contextEditing) {
      // Check if this is a draft cell and get the appropriate row data
      const cell = parseCellIndex(contextEditing.index);
      if (model.isDraftCell(cell)) {
        const draftRow = model.draftRows.value[cell.row];
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

  // NOTE: Important to get a snapshot to eject from the live object.
  const formValues = useMemo(() => (originalRow ? getSnapshot(originalRow) : {}), [originalRow]);

  const handleOpenChange = useCallback((nextOpen: boolean) => {
    if (nextOpen === false) {
      setEditing(null);
      onSave?.();
    }
    setLocalEditing(nextOpen);
  }, []);

  const handleSave = useCallback<NonNullable<FormProps<any>['onSave']>>(
    (values) => {
      const path = fieldProjection.field.path;
      const value = getDeep(values, [path]);
      setDeep(originalRow, [path], value);
      contextEditing?.cellElement?.focus();
      setEditing(null);
      setLocalEditing(false);
      onSave?.();
    },
    [fieldProjection.field.path, onSave, contextEditing, originalRow],
  );

  const handleCreate = useCallback<NonNullable<FormProps<any>['onCreate']>>(
    (values) => {
      if (refSchema && onCreate) {
        const objectWithId = onCreate(refSchema, values);
        if (objectWithId) {
          const ref = Ref.make(objectWithId);
          const path = fieldProjection.field.path;
          setDeep(originalRow, [path], ref);
        }
      }
      contextEditing?.cellElement?.focus();
      setEditing(null);
      setLocalEditing(false);
      onSave?.();
    },
    [fieldProjection.field.path, onSave, contextEditing, originalRow, refSchema, onCreate],
  );

  const handleQueryRefOptions = useCallback<NonNullable<FormProps<any>['onQueryRefOptions']>>(
    async ({ typename }) => {
      const { schema, space } = getSchema({ typename });
      if (model && schema && space) {
        const objects = await space.db.query(Filter.type(schema)).run();
        return objects
          .map((obj) => {
            return {
              dxn: Obj.getDXN(obj),
              label: getValue(obj, fieldProjection.field.referencePath!) || obj.id.toString(),
            };
          })
          .filter(isTruthy);
      }

      return [];
    },
    [model],
  );

  if (!editing) {
    return null;
  }

  return (
    <Popover.Root open={editing} onOpenChange={handleOpenChange}>
      <Popover.VirtualTrigger virtualRef={anchorRef} />
      <Popover.Portal>
        <Popover.Content tabIndex={-1} classNames='popover-card-width density-fine'>
          <Popover.Arrow />
          <Popover.Viewport>
            <Form
              {...formProps}
              autoFocus
              schema={narrowedSchema}
              values={formValues}
              onSave={handleSave}
              onQueryRefOptions={handleQueryRefOptions}
              {...(createSchema && {
                createSchema,
                createInitialValuePath: fieldProjection.field.referencePath,
                createOptionIcon: 'ph--plus--regular',
                createOptionLabel,
                onCreate: handleCreate,
              })}
            />
          </Popover.Viewport>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
};
