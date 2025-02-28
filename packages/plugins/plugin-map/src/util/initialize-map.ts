//
// Copyright 2025 DXOS.org
//

import { FormatEnum, type GeoPoint, type JsonProp } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { type Space, create, makeRef } from '@dxos/react-client/echo';
import { createView, ViewProjection, getSchemaProperties } from '@dxos/schema';

import { MapType } from '../types';

type InitializeMapProps = {
  space: Space;
  name?: string;
  coordinates?: GeoPoint[];
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

    // Only auto-find a LatLng property if none is specified
    if (propertyOfInterest) {
      const viewProjection = new ViewProjection(schema, view);
      const fieldId = viewProjection.getFieldId(propertyOfInterest as JsonProp);

      if (fieldId) {
        view.query.metadata = {
          // TODO(ZaymonFC): Is there a more precise name for this?
          fieldOfInterest: fieldId,
        };
      }
    } else {
      // Find a property with LatLng format
      const coordinateProp = getSchemaProperties(schema.ast).find((prop) => prop.format === FormatEnum.LatLng)?.name;

      if (coordinateProp) {
        // Use ViewProjection to get stable field ID
        const viewProjection = new ViewProjection(schema, view);
        const fieldId = viewProjection.getFieldId(coordinateProp as JsonProp);

        if (fieldId) {
          view.query.metadata = {
            // TODO(ZaymonFC): Is there a more precise name for this?
            fieldOfInterest: fieldId,
          };
        }
      }
    }
  }

  space.db.add(view);
  map.view = makeRef(view);
  space.db.add(map);

  return { map };
};
