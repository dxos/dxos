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
import { type KanbanType, KanbanSettingsSchema } from '@dxos/react-ui-kanban';
import { ViewType, ViewProjection } from '@dxos/schema';

import { KanbanAction } from '../types';

type KanbanViewEditorProps = { kanban: KanbanType };

export const KanbanViewEditor = ({ kanban }: KanbanViewEditorProps) => {
  const { dispatchPromise: dispatch } = useIntentDispatcher();
  const client = useClient();
  const space = getSpace(kanban);
  const currentTypename = useMemo(
    () => kanban?.cardView?.target?.query?.typename,
    [kanban?.cardView?.target?.query?.typename],
  );
  const schema = useSchema(client, space, currentTypename);
  const views = useQuery(space, Filter.type(ViewType));

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
      void dispatch?.(createIntent(KanbanAction.DeleteCardField, { kanban, fieldId }));
    },
    [dispatch, kanban],
  );

  const projection = useMemo(() => {
    if (kanban?.cardView?.target && schema) {
      const jsonSchema = schema instanceof EchoSchema ? schema.jsonSchema : Type.toJsonSchema(schema);
      return new ViewProjection(jsonSchema, kanban.cardView.target);
    }
  }, [kanban?.cardView?.target, JSON.stringify(schema)]);

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

  if (!space || !schema || !kanban.cardView?.target) {
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
        view={kanban.cardView.target}
        onTypenameChanged={Type.isMutable(schema) ? handleUpdateTypename : undefined}
        onDelete={Type.isMutable(schema) ? handleDelete : undefined}
        outerSpacing={false}
      />
    </>
  );
};
