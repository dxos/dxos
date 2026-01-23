//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import { Obj } from '@dxos/echo';
import { Format } from '@dxos/echo/internal';
import { invariant } from '@dxos/invariant';
import { useSchema } from '@dxos/react-client/echo';
import { Form, type FormFieldMap, SelectField } from '@dxos/react-ui-form';
import { useProjectionModel } from '@dxos/react-ui-kanban';
import { type Kanban } from '@dxos/react-ui-kanban/types';
import { getTypenameFromQuery } from '@dxos/schema';

import { SettingsSchema } from '../types';

type KanbanViewEditorProps = { object: Kanban.Kanban };

export const KanbanViewEditor = ({ object }: KanbanViewEditorProps) => {
  const db = Obj.getDatabase(object);
  const view = object.view.target;
  const currentTypename = view?.query ? getTypenameFromQuery(view.query.ast) : undefined;
  const schema = useSchema(db, currentTypename);
  const projection = useProjectionModel(schema, object);

  const fieldProjections = projection?.getFieldProjections() || [];
  const selectFields = fieldProjections
    .filter((field) => field.props.format === Format.TypeFormat.SingleSelect)
    .map(({ field }) => ({ value: field.id, label: field.path }));

  const handleSave = useCallback(
    (values: Partial<{ columnFieldId: string }>) => {
      invariant(view);
      view.projection.pivotFieldId = values.columnFieldId;
    },
    [view],
  );

  const initialValues = useMemo(
    () => ({ columnFieldId: view?.projection.pivotFieldId }),
    [view?.projection.pivotFieldId],
  );

  const fieldMap: FormFieldMap = useMemo(
    () => ({ columnFieldId: (props) => <SelectField {...props} options={selectFields} /> }),
    [selectFields],
  );

  return (
    <Form.Root schema={SettingsSchema} values={initialValues} fieldMap={fieldMap} autoSave onSave={handleSave}>
      <Form.FieldSet />
    </Form.Root>
  );
};
