//
// Copyright 2025 DXOS.org
//

import { createStatic } from '@dxos/echo-schema';

import { type ApiAuthorization, ServiceType } from './schema';

export type ServiceQuery = {
  name?: string;
  category?: string;
};

export interface BaseServiceRegistry {
  queryServices(query: ServiceQuery): Promise<ServiceType[]>;
}

export class MockServiceRegistry implements BaseServiceRegistry {
  async queryServices(query: ServiceQuery): Promise<ServiceType[]> {
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

// TODO(burdon): Find/deploy chess API.

const TEST_SERVICES: ServiceType[] = [
  /**
   * dxn:service:example.com/service/FlightSearch
   */
  createStatic(ServiceType, {
    serviceId: 'example.com/service/FlightSearch',
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

  /**
   * dxn:service:example.com/service/HotelSearch
   */
  // TODO(burdon): Not working.
  createStatic(ServiceType, {
    serviceId: 'example.com/service/HotelSearch',
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
    serviceId: 'example.com/service/Weather',
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
] as const;

export const categoryIcons: Record<string, string> = {
  finance: 'ph--bank--regular',
  travel: 'ph--airplane-takeoff--regular',
  health: 'ph--heart--regular',
  education: 'ph--books--regular',
  entertainment: 'ph--music-notes--regular',
  shopping: 'ph--shopping-cart--regular',
  utilities: 'ph--lightning--regular',
  weather: 'ph--cloud-rain--regular',
} as const;
