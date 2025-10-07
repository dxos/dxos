//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import { Type } from '@dxos/echo';
import { EchoSchema, FormatEnum } from '@dxos/echo-schema';
import { useClient } from '@dxos/react-client';
import { getSpace, useSchema } from '@dxos/react-client/echo';
import { type CustomInputMap, Form, SelectInput } from '@dxos/react-ui-form';
import { Kanban } from '@dxos/react-ui-kanban/types';
import { type DataType, ProjectionModel, typenameFromQuery } from '@dxos/schema';

type KanbanViewEditorProps = { view: DataType.View };

export const KanbanViewEditor = ({ view }: KanbanViewEditorProps) => {
  const client = useClient();
  const space = getSpace(view);
  const currentTypename = view.query ? typenameFromQuery(view.query.ast) : undefined;
  const schema = useSchema(client, space, currentTypename);

  const projection = useMemo(() => {
    if (schema) {
      const jsonSchema = schema instanceof EchoSchema ? schema.jsonSchema : Type.toJsonSchema(schema);
      const projection = new ProjectionModel(jsonSchema, view.projection);
      projection.normalizeView();
      return projection;
    }
  }, [view.projection, JSON.stringify(schema)]);

  const fieldProjections = projection?.getFieldProjections() || [];
  const selectFields = fieldProjections
    .filter((field) => field.props.format === FormatEnum.SingleSelect)
    .map(({ field }) => ({ value: field.id, label: field.path }));

  const handleSave = useCallback(
    (values: Partial<{ columnFieldId: string }>) => {
      view.projection.pivotFieldId = values.columnFieldId;
    },
    [view],
  );

  const initialValues = useMemo(
    () => ({ columnFieldId: view.projection.pivotFieldId }),
    [view.projection.pivotFieldId],
  );
  const custom: CustomInputMap = useMemo(
    () => ({ columnFieldId: (props) => <SelectInput {...props} options={selectFields} /> }),
    [selectFields],
  );

  return (
    <Form
      Custom={custom}
      schema={Kanban.SettingsSchema}
      values={initialValues}
      onSave={handleSave}
      autoSave
      outerSpacing={false}
      classNames='pbs-inputSpacingBlock'
    />
  );
};
