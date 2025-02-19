import { createStatic } from '@dxos/echo-schema';
import { ServiceType, type ApiAuthorization } from '../types';

export type ServiceQuery = {
  // TODO
};

export interface ServiceRegistry {
  queryServices(query: ServiceQuery): Promise<ServiceType[]>;
}

export class MockServiceRegistry implements ServiceRegistry {
  async queryServices(query: ServiceQuery): Promise<ServiceType[]> {
    return [
      //
      SERVICES.flightSearch,
      // SERVICES.hotelSearch, // Doesn't work.
      SERVICES.weather,
    ];
  }
}

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

// TODO(dmaretskyi): Will be an actual registry.
export const SERVICES = {
  
  // dxn:service:example.com/service/FlightSearch
  flightSearch: createStatic(ServiceType, {
    serviceId: 'example.com/service/FlightSearch',

    name: 'Amadeus Flight Search',
    description: 'Search for flights',
    interfaces: [
      {
        kind: 'api',
        schemaUrl: 'https://api.apis.guru/v2/specs/amadeus.com/amadeus-flight-availabilities-search/1.0.2/swagger.json',
        authorization: AMADEUS_AUTH,
      },
    ],
  }),

  // dxn:service:example.com/service/HotelSearch
  hotelSearch: createStatic(ServiceType, {
    serviceId: 'example.com/service/HotelSearch',

    name: 'Amadeus Hotel Search',
    description: 'Search for hotels',
    interfaces: [
      {
        kind: 'api',
        schemaUrl: 'https://api.apis.guru/v2/specs/amadeus.com/amadeus-hotel-search/3.0.8/swagger.json',
        authorization: AMADEUS_AUTH,
      },
    ],
  }),

  // dxn:service:example.com/service/Weather
  weather: createStatic(ServiceType, {
    serviceId: 'example.com/service/Weather',

    name: 'Visual Crossing Weather',
    description: 'Get weather forecast',
    interfaces: [
      {
        kind: 'api',
        schemaUrl: 'https://api.apis.guru/v2/specs/visualcrossing.com/weather/4.6/openapi.json',
        authorization: VISUAL_CROSSING_CREDENTIALS,
      },
    ],
  }),
} as const;

/*

- Search service: serp


*/
