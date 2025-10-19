//
// Copyright 2025 DXOS.org
//

import { Obj } from '@dxos/echo';

import { type ApiAuthorization, type BaseServiceRegistry, ServiceType, categoryIcons } from '../types';

export class MockServiceRegistry implements BaseServiceRegistry {
  async queryServices(): Promise<ServiceType[]> {
    return TEST_SERVICES;
  }
}

// TODO(burdon): Can we generalize credentials?

const AMADEUS_AUTH: ApiAuthorization = {
  type: 'oauth',
  clientId: 'BOEnpLd1sMyKjAPGKYeAPFFy60u53QEG',
  clientSecret: 'n4qldSN7usvD57gm',
  tokenUrl: 'https://test.api.amadeus.com/v1/security/oauth2/token',
  grantType: 'client_credentials',
};

const VISUAL_CROSSING_CREDENTIALS: ApiAuthorization = {
  type: 'api-key',
  key: 'FDPRVS953KB4GQQLD25GRT975',
  placement: {
    type: 'query',
    name: 'key',
  },
};

// Registries:
//  - https://apis.guru
//  - https://rapidapi.com
//  - https://github.com/konfig-sdks/openapi-examples
//  - https://publicapis.io/?utm_source=chatgpt.com

// Examples:
//  - https://petstore.swagger.io/v2/swagger.json (testing)
//  - https://lichess.org/api
//  - https://github.com/konfig-sdks/openapi-examples/tree/main/xkcd
//  - https://api.coindesk.com/v1/bpi/currentprice.json
//  - https://www.coingecko.com/en/api/documentation

// TODO(burdon): Support yaml endpoints.
//  - e.g., https://github.com/konfig-sdks/openapi-examples/blob/main/xkcd/openapi.yaml

const TEST_SERVICES: ServiceType[] = [
  Obj.make(ServiceType, {
    serviceId: 'amadeus.com/service/FlightSearch',
    name: 'Amadeus Flight Search',
    description: 'Search for local and international flights.',
    category: 'travel',
    interfaces: [
      {
        kind: 'api',
        schemaUrl: 'https://api.apis.guru/v2/specs/amadeus.com/amadeus-flight-availabilities-search/1.0.2/swagger.json',
        authorization: AMADEUS_AUTH,
      },
    ],
  }),

  Obj.make(ServiceType, {
    serviceId: 'amadeus.com/service/HotelSearch',
    name: 'Amadeus Hotel Search',
    description: 'Search for local and international hotels.',
    category: 'travel',
    interfaces: [
      {
        kind: 'api',
        schemaUrl: 'https://api.apis.guru/v2/specs/amadeus.com/amadeus-hotel-search/3.0.8/swagger.json',
        authorization: AMADEUS_AUTH,
      },
    ],
  }),

  Obj.make(ServiceType, {
    serviceId: 'visualcrossing.com/service/Weather',
    name: 'Visual Crossing Weather',
    description: 'Search for global weather forecasts.',
    category: 'weather',
    interfaces: [
      {
        kind: 'api',
        schemaUrl: 'https://api.apis.guru/v2/specs/visualcrossing.com/weather/4.6/openapi.json',
        authorization: VISUAL_CROSSING_CREDENTIALS,
      },
    ],
  }),

  // TODO(burdon): Needs auth.
  Obj.make(ServiceType, {
    serviceId: 'abstractapi.com/service/GeoLocation',
    name: 'Abstract GeoLocation',
    description: 'Get the location of any IP address.',
    category: 'geolocation',
    interfaces: [
      {
        kind: 'api',
        schemaUrl: 'https://api.apis.guru/v2/specs/abstractapi.com/geolocation/1.0.0/openapi.json',
      },
    ],
  }),

  //
  // Testing
  //

  ...Array.from({ length: 20 }, (_, i) =>
    Obj.make(ServiceType, {
      serviceId: `example.com/service/test-${i}`,
      name: `Test ${i}`,
      description: `Test ${i}`,
      category: Object.keys(categoryIcons)[Math.floor(Math.random() * Object.keys(categoryIcons).length)],
      interfaces: [
        {
          kind: 'api',
          schemaUrl: 'https://petstore.swagger.io/v2/swagger.json',
        },
      ],
    }),
  ),
] as const;
