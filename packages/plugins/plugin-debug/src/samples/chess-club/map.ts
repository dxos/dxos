//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as SampleSpace from '@dxos/app-toolkit/SampleSpace';
import { Database, Filter, JsonSchema, Query, View } from '@dxos/echo';
import * as Map from '@dxos/plugin-map/Map';
import { ViewModel } from '@dxos/schema';
import { Organization } from '@dxos/types';

import { DATA_CENTERS } from './data-centers.ts';

export type MapResult = { map: Map.Map; dataCenters: Organization.Organization[] };

/**
 * Every Cloudflare data centre pinned on a world map. A map plots the rows of a view at their geolocation field, so
 * each data centre is an organization with a location, and the map is a view over them pivoted on `location`.
 */
export const DataCenterMap: SampleSpace.Partial<MapResult> = SampleSpace.partial('map', {
  schemas: [Organization.Organization, Map.Map, View.View],
  run: () =>
    Effect.gen(function* () {
      const dataCenters: Organization.Organization[] = [];
      for (const [code, city, lng, lat] of DATA_CENTERS) {
        dataCenters.push(
          yield* Database.add(
            Organization.make({
              name: `Cloudflare ${code}`,
              description: `Cloudflare data centre in ${city}.`,
              website: 'https://www.cloudflare.com/network/',
              location: [lng, lat],
            }),
          ),
        );
      }

      const view = yield* Database.add(
        ViewModel.make({
          query: Query.select(Filter.type(Organization.Organization)),
          queryRaw: undefined,
          jsonSchema: JsonSchema.toJsonSchema(Organization.Organization),
          fields: ['name', 'description', 'location'],
          pivotFieldName: 'location',
        }),
      );
      const map = yield* Database.add(Map.make({ name: 'Cloudflare data centres', view, zoom: 1.5 }));
      return { map, dataCenters };
    }),
});
