//
// Copyright 2025 DXOS.org
//

import { FormatEnum, type GeoPoint } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { type Space, create, makeRef } from '@dxos/react-client/echo';
import { createView } from '@dxos/schema';

import { MapType } from '../types';

type InitializeMapProps = {
  space: Space;
  name?: string;
  coordinates?: GeoPoint;
  initialSchema?: string;
  propertyOfInterest?: string;
};

export const initializeMap = async ({
  space,
  name,
  coordinates,
  initialSchema,
  propertyOfInterest,
}: InitializeMapProps): Promise<{ map: MapType }> => {
  const map = create(MapType, { name });

  if (coordinates) {
    map.coordinates = coordinates;
  }

  // Create a view with minimal configuration
  const view = createView({
    name: "Map's item view",
    fields: [],
  });

  if (initialSchema) {
    const schema = await space.db.schemaRegistry.query({ typename: initialSchema }).firstOrUndefined();
    invariant(schema, `Schema not found: ${initialSchema}`);

    view.query.type = initialSchema;

    if (propertyOfInterest) {
      view.query.metadata = {
        // TODO(ZaymonFC): Is there a more precise name for this?
        fieldOfInterest: propertyOfInterest,
      };
    } else {
      // Find a property with LatLng format
      const coordinateProperties: string[] = [];
      if (schema.jsonSchema?.properties) {
        // Look for properties that use the LatLng format enum
        const properties = Object.entries(schema.jsonSchema.properties).reduce<string[]>((acc, [key, value]) => {
          if (typeof value === 'object' && value?.format === FormatEnum.LatLng) {
            acc.push(key);
          }
          return acc;
        }, []);

        coordinateProperties.push(...properties);
      }

      const coordinateProp = coordinateProperties.at(0);
      if (coordinateProp) {
        view.query.metadata = {
          // TODO(ZaymonFC): Is there a more precise name for this?
          fieldOfInterest: coordinateProp,
        };
      }
    }
  }

  space.db.add(view);
  map.view = makeRef(view);
  space.db.add(map);

  return { map };
};
