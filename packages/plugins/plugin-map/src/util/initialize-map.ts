//
// Copyright 2025 DXOS.org
//

import { Obj, Ref, type Type } from '@dxos/echo';
import { FormatEnum } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { type Space } from '@dxos/react-client/echo';
import { createView } from '@dxos/schema';

import { MapType } from '../types';
import { setLocationProperty } from '../util';

type InitializeMapProps = {
  space: Space;
  name?: string;
  coordinates?: Type.Format.GeoPoint;
  initialSchema?: string;
  locationProperty?: string;
};

export const initializeMap = async ({
  space,
  name,
  coordinates,
  initialSchema,
  locationProperty,
}: InitializeMapProps): Promise<{ map: MapType }> => {
  const map = Obj.make(MapType, { name });
  if (coordinates) {
    map.coordinates = coordinates;
  }

  const view = createView({ name: "Map's item view", fields: [] });

  if (initialSchema) {
    const schema = await space.db.schemaRegistry.query({ typename: initialSchema }).firstOrUndefined();
    invariant(schema, `Schema not found: ${initialSchema}`);

    view.query.typename = initialSchema;

    if (locationProperty) {
      setLocationProperty(view, locationProperty);
    } else {
      // Find a property with LatLng format.
      const locationProperties: string[] = [];
      if (schema.jsonSchema?.properties) {
        // Look for properties that use the LatLng format enum.
        const properties = Object.entries(schema.jsonSchema.properties).reduce<string[]>((acc, [key, value]) => {
          if (typeof value === 'object' && value?.format === FormatEnum.GeoPoint) {
            acc.push(key);
          }
          return acc;
        }, []);

        locationProperties.push(...properties);
      }
      const locationProp = locationProperties.at(0);
      if (locationProp) {
        setLocationProperty(view, locationProp);
      }
    }
  }

  space.db.add(view);
  map.view = Ref.make(view);
  space.db.add(map);

  return { map };
};
