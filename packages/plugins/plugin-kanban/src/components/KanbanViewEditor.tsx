//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import { createIntent, useIntentDispatcher } from '@dxos/app-framework';
import { Type } from '@dxos/echo';
import { EchoSchema, FormatEnum } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { useClient } from '@dxos/react-client';
import { Filter, getSpace, useQuery, useSchema } from '@dxos/react-client/echo';
import { ViewEditor, Form, SelectInput, type CustomInputMap } from '@dxos/react-ui-form';
import { KanbanSettingsSchema, type KanbanView } from '@dxos/react-ui-kanban';
import { DataType, ProjectionModel } from '@dxos/schema';

import { KanbanAction } from '../types';

type KanbanViewEditorProps = { view: DataType.View };

export const KanbanViewEditor = ({ view }: KanbanViewEditorProps) => {
  const { dispatchPromise: dispatch } = useIntentDispatcher();
  const client = useClient();
  const space = getSpace(view);
  const kanban = view.presentation.target as KanbanView;
  const currentTypename = useMemo(() => view.query.typename, [view.query.typename]);
  const schema = useSchema(client, space, currentTypename);
  const views = useQuery(space, Filter.type(DataType.View));

  const handleUpdateTypename = useCallback(
    (newTypename: string) => {
      invariant(schema);
      invariant(Type.isMutable(schema));

      const matchingViews = views.filter((view) => view.query.typename === currentTypename);
      for (const view of matchingViews) {
        view.query.typename = newTypename;
      }

      schema.updateTypename(newTypename);
    },
    [views, schema],
  );

  const handleDelete = useCallback(
    (fieldId: string) => {
      void dispatch?.(createIntent(KanbanAction.DeleteCardField, { view, fieldId }));
    },
    [dispatch, view],
  );

  const projection = useMemo(() => {
    if (schema) {
      const jsonSchema = schema instanceof EchoSchema ? schema.jsonSchema : Type.toJsonSchema(schema);
      return new ProjectionModel(jsonSchema, view.projection);
    }
  }, [view.projection, JSON.stringify(schema)]);

  const fieldProjections = projection?.getFieldProjections() || [];
  const selectFields = fieldProjections
    .filter((field) => field.props.format === FormatEnum.SingleSelect)
    .map(({ field }) => ({ value: field.id, label: field.path }));

  const handleSave = useCallback(
    (values: Partial<{ columnFieldId: string }>) => {
      kanban.columnFieldId = values.columnFieldId;
    },
    [kanban],
  );

  const initialValues = useMemo(() => ({ columnFieldId: kanban.columnFieldId }), [kanban.columnFieldId]);
  const custom: CustomInputMap = useMemo(
    () => ({ columnFieldId: (props) => <SelectInput {...props} options={selectFields} /> }),
    [selectFields],
  );

  if (!space || !schema || !projection) {
    return null;
  }

  return (
    <>
      <Form
        Custom={custom}
        schema={KanbanSettingsSchema}
        values={initialValues}
        onSave={handleSave}
        autoSave
        outerSpacing={false}
        classNames='pbs-inputSpacingBlock'
      />
      <ViewEditor
        registry={space.db.schemaRegistry}
        schema={schema}
        view={view}
        onTypenameChanged={Type.isMutable(schema) ? handleUpdateTypename : undefined}
        onDelete={Type.isMutable(schema) ? handleDelete : undefined}
        outerSpacing={false}
      />
    </>
  );
};
