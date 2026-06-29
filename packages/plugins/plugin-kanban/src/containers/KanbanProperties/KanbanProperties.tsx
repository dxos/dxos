//
// Copyright 2025 DXOS.org
//

import { RegistryContext } from '@effect-atom/atom-react';
import React, { useCallback, useContext, useMemo } from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Obj } from '@dxos/echo';
import { Format } from '@dxos/echo/Format';
import { useObject, useType } from '@dxos/react-client/echo';
import { type FormFieldMap, Form, SelectField } from '@dxos/react-ui-form';
import { getTypeURIFromQuery } from '@dxos/schema';

import { useProjectionModel } from '#hooks';
import { type Kanban, UNCATEGORIZED_VALUE, KanbanSettingsSchema, KanbanViewSettingsSchema } from '#types';

export type KanbanPropertiesProps = AppSurface.ObjectPropertiesProps<Kanban.Kanban>;

/**
 * Object-properties panel for a Kanban. Renders fields common to every kanban
 * (currently the "Hide uncategorized column" toggle); for view-variant
 * kanbans an additional "Column field" picker drives the View's pivot
 * field. Items-variant kanbans use a hardcoded `spec.pivotField`, so that
 * field is omitted there.
 */
export const KanbanProperties = ({ subject: object }: KanbanPropertiesProps) => {
  const registry = useContext(RegistryContext);
  const db = Obj.getDatabase(object);
  const isView = object.spec.kind === 'view';
  const [view, updateView] = useObject(object.spec.kind === 'view' ? object.spec.view : undefined);
  const [, updateKanban] = useObject(object);
  const currentTypeUri = view?.query ? getTypeURIFromQuery(view.query.ast) : undefined;
  const schema = useType(db, currentTypeUri);
  const projection = useProjectionModel(schema, object, registry);

  const fieldProjections = projection?.getFieldProjections() ?? [];
  const selectFields = useMemo(
    () =>
      fieldProjections
        .filter((field) => field.props.format === Format.TypeFormat.SingleSelect)
        .map(({ field }) => ({ value: field.id, label: field.path })),
    [fieldProjections],
  );

  const hideUncategorized = object.arrangement.columns[UNCATEGORIZED_VALUE]?.hidden ?? false;

  const handleValuesChanged = useCallback(
    (values: Partial<{ columnFieldId: string; hideUncategorized: boolean }>) => {
      if (isView && values.columnFieldId != null) {
        updateView((view) => {
          view.projection.pivotFieldId = values.columnFieldId!;
        });
      }
      if (values.hideUncategorized !== undefined) {
        updateKanban((kanban) => {
          const existing = kanban.arrangement.columns[UNCATEGORIZED_VALUE];
          if (existing) {
            existing.hidden = values.hideUncategorized;
          } else {
            kanban.arrangement.columns[UNCATEGORIZED_VALUE] = {
              ids: [],
              hidden: values.hideUncategorized,
            };
          }
        });
      }
    },
    [isView, updateView, updateKanban],
  );

  const initialValues = useMemo(
    () => ({
      ...(isView ? { columnFieldId: view?.projection.pivotFieldId } : {}),
      hideUncategorized,
    }),
    [isView, view?.projection.pivotFieldId, hideUncategorized],
  );

  const fieldMap: FormFieldMap = useMemo(
    () => ({ columnFieldId: (props) => <SelectField {...props} options={selectFields} /> }),
    [selectFields],
  );

  // Schema is picked by `kanban.spec.kind` — they have different shapes,
  // so cast for `Form.Root`'s single-schema prop.
  const settingsSchema = (isView ? KanbanViewSettingsSchema : KanbanSettingsSchema) as any;

  return (
    <Form.Section>
      <Form.Root
        schema={settingsSchema}
        values={initialValues}
        fieldMap={fieldMap}
        onValuesChanged={handleValuesChanged}
      >
        <Form.FieldSet />
      </Form.Root>
    </Form.Section>
  );
};
