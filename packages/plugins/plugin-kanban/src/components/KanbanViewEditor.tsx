//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import { createIntent, useIntentDispatcher } from '@dxos/app-framework';
import { FormatEnum } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { Filter, getSpace, useQuery, useSchema } from '@dxos/react-client/echo';
import { ViewEditor, Form, SelectInput, type CustomInputMap } from '@dxos/react-ui-form';
import { type KanbanType, KanbanSettingsSchema } from '@dxos/react-ui-kanban';
import { ViewType, ViewProjection } from '@dxos/schema';

import { KanbanAction } from '../types';

type KanbanViewEditorProps = { kanban: KanbanType };

export const KanbanViewEditor = ({ kanban }: KanbanViewEditorProps) => {
  const { dispatchPromise: dispatch } = useIntentDispatcher();
  const space = getSpace(kanban);
  const currentTypename = useMemo(
    () => kanban?.cardView?.target?.query?.typename,
    [kanban?.cardView?.target?.query?.typename],
  );
  const schema = useSchema(space, currentTypename);
  const views = useQuery(space, Filter.schema(ViewType));

  const handleUpdateTypename = useCallback(
    (newTypename: string) => {
      invariant(schema);
      const matchingViews = views.filter((view) => view.query.typename === currentTypename);
      for (const view of matchingViews) {
        view.query.typename = newTypename;
      }

      schema.mutable.updateTypename(newTypename);
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
      return new ViewProjection(schema, kanban.cardView.target);
    }
  }, [kanban?.cardView?.target, schema, JSON.stringify(schema)]);

  const fieldProjections = projection?.getFieldProjections() || [];
  const selectFields = fieldProjections
    .filter((field) => field.props.format === FormatEnum.SingleSelect)
    .map(({ field }) => ({ value: field.id, label: field.path }));

  const onSave = useCallback(
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
      <Form schema={KanbanSettingsSchema} values={initialValues} onSave={onSave} autoSave Custom={custom} />
      <ViewEditor
        registry={space.db.schemaRegistry}
        schema={schema}
        view={kanban.cardView.target}
        onTypenameChanged={schema.readonly ? undefined : handleUpdateTypename}
        onDelete={schema.readonly ? undefined : handleDelete}
      />
    </>
  );
};
