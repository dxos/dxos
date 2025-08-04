//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import { Type } from '@dxos/echo';
import { EchoSchema, FormatEnum } from '@dxos/echo-schema';
import { useClient } from '@dxos/react-client';
import { getSpace, useSchema } from '@dxos/react-client/echo';
import { type CustomInputMap, Form, SelectInput } from '@dxos/react-ui-form';
import { KanbanSettingsSchema, type KanbanView } from '@dxos/react-ui-kanban';
import { type DataType, ProjectionModel } from '@dxos/schema';

type KanbanViewEditorProps = { view: DataType.View };

export const KanbanViewEditor = ({ view }: KanbanViewEditorProps) => {
  const client = useClient();
  const space = getSpace(view);
  const kanban = view.presentation.target as KanbanView;
  const currentTypename = useMemo(() => view.query.typename, [view.query.typename]);
  const schema = useSchema(client, space, currentTypename);

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

  return (
    <Form
      Custom={custom}
      schema={KanbanSettingsSchema}
      values={initialValues}
      onSave={handleSave}
      autoSave
      outerSpacing={false}
      classNames='pbs-inputSpacingBlock'
    />
  );
};
