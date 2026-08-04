//
// Copyright 2025 DXOS.org
//

import React, { useMemo } from 'react';

import { type Surface } from '@dxos/app-framework/ui';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Database, Obj, Type } from '@dxos/echo';
import { type FormFieldRendererProps, SelectField, useFormValues } from '@dxos/react-ui-form';

/** The form renderer's own props ride alongside `data` on the surface envelope; `type` comes from the field AST. */
export type PivotColumnFieldProps = Surface.ComponentProps<AppSurface.FormInputData> &
  Omit<FormFieldRendererProps, 'type'>;

/**
 * Form field offering the single-select properties of the form's currently chosen typename as the
 * kanban's pivot column. It consumes the whole surface envelope, so it takes no `props` mapper.
 */
export const PivotColumnField = ({ data, ...inputProps }: PivotColumnFieldProps) => {
  const ast = data.fieldPropertyAst;
  const target = data.target;
  const db = Database.isDatabase(target) ? target : Obj.isObject(target) ? Obj.getDatabase(target) : undefined;
  const { typename } = useFormValues('KanbanForm');
  const [selectedSchema] = useMemo(
    () =>
      db
        ? db.graph.registry
            .list()
            .filter(Type.isType)
            .filter((type) => Type.getTypename(type) === typename)
        : [],
    [db, typename],
  );
  const singleSelectColumns = useMemo(() => {
    const properties = selectedSchema?.jsonSchema.properties;
    if (!properties) {
      return [];
    }

    return Object.entries(properties).reduce<string[]>((acc, [key, value]) => {
      if (typeof value === 'object' && value !== null && (value as { format?: string }).format === 'single-select') {
        acc.push(key);
      }
      return acc;
    }, []);
  }, [selectedSchema]);

  if (!ast || !db || !typename) {
    return null;
  }

  const props: FormFieldRendererProps = { ...inputProps, type: ast };

  return <SelectField {...props} options={singleSelectColumns.map((column) => ({ value: column }))} />;
};
