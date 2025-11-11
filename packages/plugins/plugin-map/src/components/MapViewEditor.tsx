//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { Type } from '@dxos/echo';
import { FormatEnum } from '@dxos/echo/internal';
import { useClient } from '@dxos/react-client';
import { getSpace, useSchema } from '@dxos/react-client/echo';
import { type CustomInputMap, Form, SelectInput } from '@dxos/react-ui-form';
import { getTypenameFromQuery } from '@dxos/schema';

import { type Map } from '../types';

// TODO(wittjosiah): Add center and zoom.
export const MapSettingsSchema = Schema.Struct({
  coordinateSource: Schema.optional(Schema.String.annotations({ title: 'Coordinate source type' })),
  coordinateColumn: Schema.optional(Schema.String.annotations({ title: 'Coordinate column' })),
});

type MapViewEditorProps = { object: Map.Map };

export const MapViewEditor = ({ object }: MapViewEditorProps) => {
  const client = useClient();
  const space = getSpace(object);
  const view = object?.view.target;
  const typename = view?.query ? getTypenameFromQuery(view.query.ast) : undefined;
  const currentSchema = useSchema(client, space, typename);

  const [allSchemata, setAllSchemata] = useState<Type.Schema[]>([]);

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
      if (typeof value === 'object' && value?.format === FormatEnum.GeoPoint) {
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

  const custom: CustomInputMap = useMemo(
    () => ({
      coordinateSource: (props) => <SelectInput {...props} options={schemaOptions} />,
      coordinateColumn: (props) => <SelectInput {...props} options={locationFields} />,
    }),
    [schemaOptions, locationFields],
  );

  if (!space || !object) {
    return null;
  }

  return (
    <Form
      schema={MapSettingsSchema}
      values={initialValues}
      onSave={onSave}
      autoSave
      Custom={custom}
      outerSpacing='blockStart-0'
      classNames='pbs-inputSpacingBlock'
    />
  );
};
