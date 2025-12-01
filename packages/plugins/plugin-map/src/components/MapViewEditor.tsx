//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { Type } from '@dxos/echo';
import { Format } from '@dxos/echo/internal';
import { getSpace, useSchema } from '@dxos/react-client/echo';
import { type FormFieldMap, NewForm, SelectField } from '@dxos/react-ui-form';
import { getTypenameFromQuery } from '@dxos/schema';

import { type Map } from '../types';

// TODO(wittjosiah): Add center and zoom.
export const MapSettingsSchema = Schema.Struct({
  coordinateSource: Schema.optional(Schema.String.annotations({ title: 'Coordinate source type' })),
  coordinateColumn: Schema.optional(Schema.String.annotations({ title: 'Coordinate column' })),
});

type MapViewEditorProps = { object: Map.Map };

export const MapViewEditor = ({ object }: MapViewEditorProps) => {
  const space = getSpace(object);
  const view = object?.view?.target;
  const typename = view?.query ? getTypenameFromQuery(view.query.ast) : undefined;
  const currentSchema = useSchema(space, typename);

  const [allSchemata, setAllSchemata] = useState<Type.RuntimeType[]>([]);

  useEffect(() => {
    if (!space) {
      return;
    }

    const unsubscribe = space.db.schemaRegistry.query().subscribe(
      (query) => {
        const schemata = query.results;
        setAllSchemata(schemata);
      },
      { fire: true },
    );
    return () => unsubscribe();
  }, [space]);

  const schemaOptions = useMemo(() => {
    const uniqueTypenames = new Set(allSchemata.map((schema) => schema.typename));
    return Array.from(uniqueTypenames).map((typename) => ({
      value: typename,
      label: typename,
    }));
  }, [allSchemata]);

  const jsonSchema = useMemo(() => (currentSchema ? Type.toJsonSchema(currentSchema) : {}), [currentSchema]);
  const locationFields = useMemo(() => {
    if (!jsonSchema?.properties) {
      return [];
    }

    const columns = Object.entries(jsonSchema.properties).reduce<string[]>((acc, [key, value]) => {
      if (typeof value === 'object' && value?.format === Format.TypeFormat.GeoPoint) {
        acc.push(key);
      }
      return acc;
    }, []);

    return columns.map((column) => ({ value: column, label: column }));
  }, [jsonSchema]);

  const onSave = useCallback(
    (values: Partial<{ coordinateColumn: string }>) => {
      if (view && values.coordinateColumn) {
        view.projection.pivotFieldId = values.coordinateColumn;
      }
    },
    [view],
  );

  const initialValues = useMemo(
    () => ({ coordinateSource: typename, coordinateColumn: view?.projection.pivotFieldId }),
    [view],
  );

  const fieldMap = useMemo<FormFieldMap>(
    () => ({
      coordinateSource: (props) => <SelectField {...props} options={schemaOptions} />,
      coordinateColumn: (props) => <SelectField {...props} options={locationFields} />,
    }),
    [schemaOptions, locationFields],
  );

  if (!space || !object) {
    return null;
  }

  return (
    <NewForm.Root fieldMap={fieldMap} schema={MapSettingsSchema} values={initialValues} autoSave onSave={onSave}>
      <NewForm.FieldSet />
    </NewForm.Root>
  );
};
