//
// Copyright 2025 DXOS.org
//

import { createStatic } from '@dxos/echo-schema';

import {
  type BaseServiceRegistry,
  type ServiceQuery,
  type ApiAuthorization,
  ServiceType,
  categoryIcons,
} from '../types';

export class MockServiceRegistry implements BaseServiceRegistry {
  async queryServices(query?: ServiceQuery): Promise<ServiceType[]> {
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

const TEST_SERVICES: ServiceType[] = [
  /**
   * dxn:service:example.com/service/FlightSearch
   */
  createStatic(ServiceType, {
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

  // Registries:
  //  - https://apis.guru
  //  - https://rapidapi.com
  //  - https://publicapis.io/?utm_source=chatgpt.com

  // https://lichess.org/api

  // https://petstore.swagger.io/v2/swagger.json (testing)

  // https://api.coindesk.com/v1/bpi/currentprice.json
  // https://api.apis.guru/v2/specs/abstractapi.com/geolocation/1.0.0/openapi.json
  // https://api.coindesk.com/v1/bpi/currentprice.json
  // https://www.coingecko.com/en/api/documentation

  /**
   * dxn:service:example.com/service/HotelSearch
   */
  // TODO(burdon): Not working.
  createStatic(ServiceType, {
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

  /**
   * dxn:service:example.com/service/Weather
   */
  createStatic(ServiceType, {
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

  //
  // Testing
  //

  ...Array.from({ length: 20 }, (_, i) =>
    createStatic(ServiceType, {
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
