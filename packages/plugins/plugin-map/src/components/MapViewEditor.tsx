//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { FormatEnum, S, AST, type EchoSchema } from '@dxos/echo-schema';
import { useClient } from '@dxos/react-client';
import { getSpace, useSchema } from '@dxos/react-client/echo';
import { Form, SelectInput, type CustomInputMap } from '@dxos/react-ui-form';

import { type MapType } from '../types';
import { getLocationProperty, setLocationProperty } from '../util';

export const MapSettingsSchema = S.Struct({
  coordinateSource: S.optional(S.String.annotations({ [AST.TitleAnnotationId]: 'Coordinate source type' })),
  coordinateColumn: S.optional(S.String.annotations({ [AST.TitleAnnotationId]: 'Coordinate column' })),
});

type MapViewEditorProps = { map: MapType };

export const MapViewEditor = ({ map }: MapViewEditorProps) => {
  const client = useClient();
  const space = getSpace(map);
  const currentTypename = useMemo(() => map?.view?.target?.query?.typename, [map?.view?.target?.query?.typename]);
  const currentCoordinateProperty = useMemo(() => getLocationProperty(map?.view?.target), [map?.view?.target]);
  const currentSchema = useSchema(client, space, currentTypename);

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
      if (typeof value === 'object' && value?.format === FormatEnum.GeoPoint) {
        acc.push(key);
      }
      return acc;
    }, []);

    return columns.map((column) => ({ value: column, label: column }));
  }, [currentSchema?.jsonSchema]);

  const onSave = useCallback(
    (values: Partial<{ coordinateColumn: string }>) => {
      if (map.view?.target && values.coordinateColumn) {
        setLocationProperty(map.view.target, values.coordinateColumn);
      }
    },
    [map],
  );

  const initialValues = useMemo(
    () => ({ coordinateSource: currentTypename, coordinateColumn: currentCoordinateProperty }),
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
