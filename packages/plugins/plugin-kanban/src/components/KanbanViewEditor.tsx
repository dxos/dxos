//
// Copyright 2025 DXOS.org
//

import { RegistryContext } from '@effect-atom/atom-react';
import React, { useCallback, useContext, useMemo } from 'react';

import { Obj } from '@dxos/echo';
import { Format } from '@dxos/echo/internal';
import { useObject, useSchema } from '@dxos/react-client/echo';
import { Form, type FormFieldMap, SelectField } from '@dxos/react-ui-form';
import { getTypenameFromQuery } from '@dxos/schema';

import { useProjectionModel } from '../hooks';
import { type Kanban, SettingsSchema } from '../types';

type KanbanViewEditorProps = { object: Kanban.Kanban };

export const KanbanViewEditor = ({ object }: KanbanViewEditorProps) => {
  const registry = useContext(RegistryContext);
  const db = Obj.getDatabase(object);
  const [view, updateView] = useObject(object.view);
  const currentTypename = view?.query ? getTypenameFromQuery(view.query.ast) : undefined;
  const schema = useSchema(db, currentTypename);
  const projection = useProjectionModel(schema, object, registry);

  const fieldProjections = projection?.getFieldProjections() || [];
  const selectFields = fieldProjections
    .filter((field) => field.props.format === Format.TypeFormat.SingleSelect)
    .map(({ field }) => ({ value: field.id, label: field.path }));

  const handleSave = useCallback(
    (values: Partial<{ columnFieldId: string }>) => {
      updateView((view) => {
        view.projection.pivotFieldId = values.columnFieldId;
      });
    },
    [updateView],
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
