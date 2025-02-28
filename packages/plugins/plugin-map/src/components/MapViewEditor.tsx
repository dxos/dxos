//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { FormatEnum, S, AST, type EchoSchema } from '@dxos/echo-schema';
import { getSpace, useSchema } from '@dxos/react-client/echo';
import { Form, SelectInput, type CustomInputMap } from '@dxos/react-ui-form';

import { type MapType } from '../types';

export const MapSettingsSchema = S.Struct({
  coordinateSource: S.optional(S.String.annotations({ [AST.TitleAnnotationId]: 'Coordinate source type' })),
  coordinateColumn: S.optional(S.String.annotations({ [AST.TitleAnnotationId]: 'Coordinate column' })),
});

type MapViewEditorProps = { map: MapType };

export const MapViewEditor = ({ map }: MapViewEditorProps) => {
  const space = getSpace(map);
  const currentTypename = useMemo(() => map?.view?.target?.query?.type, [map?.view?.target?.query?.type]);
  const currentSchema = useSchema(space, currentTypename);

  const [allSchemata, setAllSchemata] = useState<EchoSchema[]>([]);

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

  const locationFields = useMemo(() => {
    if (!currentSchema?.jsonSchema?.properties) {
      return [];
    }

    const columns = Object.entries(currentSchema.jsonSchema.properties).reduce<string[]>((acc, [key, value]) => {
      if (typeof value === 'object' && value?.format === FormatEnum.LatLng) {
        acc.push(key);
      }
      return acc;
    }, []);

    return columns.map((column) => ({ value: column, label: column }));
  }, [currentSchema?.jsonSchema]);

  const onSave = useCallback(
    (values: Partial<{ coordinateColumn: string }>) => {
      if (map.view?.target && values.coordinateColumn) {
        if (!map.view.target.query.metadata) {
          map.view.target.query.metadata = {};
        }
        map.view.target.query.metadata.fieldOfInterest = values.coordinateColumn;
      }
    },
    [map],
  );

  const initialValues = useMemo(
    () => ({ coordinateColumn: map.view?.target?.query?.metadata?.fieldOfInterest }),
    [map],
  );

  const custom: CustomInputMap = useMemo(
    () => ({
      coordinateSource: (props) => <SelectInput {...props} options={schemaOptions} />,
      coordinateColumn: (props) => <SelectInput {...props} options={locationFields} />,
    }),
    [schemaOptions, locationFields],
  );

  if (!space || !map.view?.target) {
    return null;
  }

  return <Form schema={MapSettingsSchema} values={initialValues} onSave={onSave} autoSave Custom={custom} />;
};
