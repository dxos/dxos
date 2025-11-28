//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Filter, Obj } from '@dxos/echo';
import { Format, Ref, type TypeAnnotation, getValue } from '@dxos/echo/internal';
import { invariant } from '@dxos/invariant';
import { getSnapshot } from '@dxos/live-object';
import { type Client } from '@dxos/react-client';
import { getSpace } from '@dxos/react-client/echo';
import { Popover } from '@dxos/react-ui';
import { Form, type FormProps } from '@dxos/react-ui-form';
import { parseCellIndex, useGridContext } from '@dxos/react-ui-grid';
import { type FieldProjection } from '@dxos/schema';
import { getDeep, isTruthy, setDeep } from '@dxos/util';

import { type ModalController, type TableModel } from '../../model';
import { translationKey } from '../../translations';
import { narrowSchema } from '../../util';

export type OnCreateHandler = (schema: Schema.Schema.AnyNoContext, values: any) => Parameters<typeof Ref.make>[0];

export type FormCellEditorProps = {
  fieldProjection: FieldProjection;
  model?: TableModel;
  schema?: Schema.Schema.AnyNoContext;
  onSave?: () => void;
  onCreate?: OnCreateHandler;
  client?: Client;
  modals?: ModalController;
  __gridScope: any;
} & Omit<FormProps<any>, 'values' | 'schema' | 'onCreate'>;

const createOptionLabel = ['create new object label', { ns: translationKey }] as [string, { ns: string }];

export const FormCellEditor = ({
  fieldProjection,
  model,
  schema,
  onSave,
  client,
  modals,
  onCreate,
  __gridScope,
  ...formProps
}: FormCellEditorProps) => {
  const { editing: contextEditing, setEditing, id: gridId } = useGridContext('ArrayEditor', __gridScope);
  const [editing, setLocalEditing] = useState(false);
  const anchorRef = useRef<HTMLButtonElement | null>(null);

  const getSchema = useCallback(
    (typeAnnotation: Pick<TypeAnnotation, 'typename'>) => {
      const space = getSpace(model!.view);
      invariant(space);

      let schema;
      if (client) {
        schema = client.graph.schemaRegistry.getSchema(typeAnnotation.typename);
      }
      if (!schema) {
        schema = space.db.schemaRegistry.getSchema(typeAnnotation.typename);
      }
      return { space, schema };
    },
    [client, model],
  );

  const handleQueryRefOptions = useCallback(
    async (typeAnnotation: TypeAnnotation) => {
      const { schema, space } = getSchema(typeAnnotation);
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
    [client, model],
  );

  const originalRow = useMemo(() => {
    if (model && contextEditing) {
      const cell = parseCellIndex(contextEditing.index);

      // Check if this is a draft cell and get the appropriate row data
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

  const handleSave = useCallback(
    (values: any) => {
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

  // NOTE: Important to get a snapshot to eject from the live object.
  const formValues = useMemo(() => (originalRow ? getSnapshot(originalRow) : {}), [originalRow]);

  const handleOpenChange = useCallback((nextOpen: boolean) => {
    if (nextOpen === false) {
      setEditing(null);
      onSave?.();
    }
    setLocalEditing(nextOpen);
  }, []);

  const refSchema = useMemo(() => {
    if (fieldProjection.props.format === Format.TypeFormat.Ref && fieldProjection.props.referenceSchema) {
      const { schema: refSchema } = getSchema({
        typename: fieldProjection.props.referenceSchema,
      });
      return refSchema;
    }
    return null;
  }, [fieldProjection.props.format, fieldProjection.props.referenceSchema, getSchema]);

  const createSchema = useMemo(() => {
    return refSchema ? Schema.omit<any, any, ['id']>('id')(refSchema) : null;
  }, [refSchema]);

  const handleCreate = useCallback(
    (values: any) => {
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
              autoFocus
              values={formValues}
              schema={narrowedSchema as any}
              onSave={handleSave}
              {...formProps}
              onQueryRefOptions={handleQueryRefOptions}
              {...(createSchema && {
                onCreate: handleCreate,
                createSchema,
                createInitialValuePath: fieldProjection.field.referencePath,
                createOptionIcon: 'ph--plus--regular',
                createOptionLabel,
              })}
            />
          </Popover.Viewport>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
};
