//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { createIntent, useIntentDispatcher } from '@dxos/app-framework';
import { type EchoSchema, FormatEnum } from '@dxos/echo-schema';
import { Filter, getSpace, useQuery } from '@dxos/react-client/echo';
import { ViewEditor, Form, SelectInput, type CustomInputMap } from '@dxos/react-ui-form';
import { type KanbanType, KanbanPropsSchema } from '@dxos/react-ui-kanban';
import { ViewType, ViewProjection } from '@dxos/schema';

import { KanbanAction } from '../types';

type KanbanViewEditorProps = { kanban: KanbanType };

export const KanbanViewEditor = ({ kanban }: KanbanViewEditorProps) => {
  const { dispatchPromise: dispatch } = useIntentDispatcher();
  const space = getSpace(kanban);

  const [schema, setSchema] = useState<EchoSchema | undefined>();

  useEffect(() => {
    if (space && kanban?.cardView?.target?.query?.type) {
      const query = space.db.schemaRegistry.query({ typename: kanban.cardView.target.query.type });
      const unsub = query.subscribe(
        () => {
          const [schema] = query.results;
          if (schema) {
            setSchema(schema);
          }
        },
        { fire: true },
      );
      return unsub;
    }
  }, [space, kanban?.cardView?.target?.query?.type]);

  const views = useQuery(space, Filter.schema(ViewType));
  const currentTypename = useMemo(() => kanban?.cardView?.target?.query?.type, [kanban?.cardView?.target?.query?.type]);
  const updateViewTypename = useCallback(
    (newTypename: string) => {
      if (!schema) {
        return;
      }
      const matchingViews = views.filter((view) => view.query.type === currentTypename);
      for (const view of matchingViews) {
        view.query.type = newTypename;
      }
      schema.updateTypename(newTypename);
    },
    [views, schema],
  );

  const handleDelete = useCallback(
    (fieldId: string) => dispatch?.(createIntent(KanbanAction.DeleteCardField, { kanban, fieldId })),
    [dispatch, kanban],
  );

  const projection = useMemo(() => {
    if (kanban?.cardView?.target && schema) {
      return new ViewProjection(schema, kanban.cardView.target);
    }
  }, [kanban?.cardView?.target, schema]);

  const selectFields = useMemo(() => {
    if (!projection) {
      return [];
    }

    return projection
      .getFieldProjections()
      .filter((field) => field.props.format === FormatEnum.SingleSelect)
      .map(({ field }) => ({ value: field.id, label: field.path }));
  }, [projection]);

  const onSave = useCallback(
    (values: Partial<{ columnFieldId: string }>) => {
      kanban.columnFieldId = values.columnFieldId;
    },
    [kanban],
  );

  const initialValues = useMemo(() => ({ columnFieldId: kanban.columnFieldId }), [kanban]);
  const custom: CustomInputMap = useMemo(
    () => ({ columnFieldId: (props) => <SelectInput {...props} options={selectFields} /> }),
    [selectFields],
  );

  if (!space || !schema || !kanban.cardView?.target) {
    return null;
  }

  return (
    <>
      <Form schema={KanbanPropsSchema} values={initialValues} onSave={onSave} autoSave Custom={custom} />
      <ViewEditor
        registry={space.db.schemaRegistry}
        schema={schema}
        view={kanban.cardView.target}
        onTypenameChanged={updateViewTypename}
        onDelete={handleDelete}
      />
    </>
  );
};
