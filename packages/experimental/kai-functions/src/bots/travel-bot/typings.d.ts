//
// Copyright 2023 DXOS.org
//

declare module 'amadeus' {
  // ISO Date formats:
  // https://en.wikipedia.org/wiki/ISO_8601

  // NOTE: GET and POST options are provided but the latter has more options.
  // https://github.com/amadeus4dev/amadeus-code-examples
  // https://amadeus4dev.github.io/amadeus-node/#flightofferssearch

  export type Geolocation = {
    latitude: number;
    longitude: number;
  };

  // Same data structure for Airport and Cities.
  // https://github.com/amadeus4dev/amadeus-code-examples/blob/master/city_search/v1/get/response.json
  // https://github.com/amadeus4dev/amadeus-code-examples/blob/master/airport_and_city_search/v1/get/locations/response.json
  export type Location = {
    type: 'location';
    subType: 'AIRPORT' | 'city';
    name: string;
    detailedName: string;
    timeZoneOffset: string; // +00:00
    iataCode: string;
    geoCode: Geolocation;
    address: {
      cityName: string;
      cityCode: string; // LON
      stateCode: string; // FR-75
      countryName: string;
      countryCode: string; // FR
      regionCode: string; // EUROP
    };
    distance: {
      value: number;
      unit: 'KM';
    };
    // analytics // TODO(burdon): ???
    relevance: number;
  };

  // https://github.com/amadeus4dev/amadeus-code-examples/blob/master/flight_offers_search/v2/post/Node%20SDK/flight_offers_search.js
  export type FlightQuery = {
    // https://amadeus.com/en/topic/travel-platform/global-distribution-system-gds
    sources: string[]; // GDS
    currencyCode?: string; // USD

    // Legs: [originDestinations] => [itineraries[segments]]
    // Maps onto array of itineraries, each of which may contain multiple segments (for non-direct flights).
    originDestinations: {
      id: string;
      originLocationCode: string;
      destinationLocationCode: string;
      departureDateTimeRange: {
        date: string; // 2020-03-01
        time?: string; // 10:00:00
      };
    }[];

    travelers: {
      id: string;
      travelerType: 'ADULT';
      fareOptions?: 'STANDARD'[];
    }[];

    searchCriteria: {
      maxFlightOffers?: number;
      flightFilters?: {
        cabinRestrictions?: {
          cabin?: string; // 'ECONOMY' | 'BUSINESS' | 'FIRST';
          coverage?: 'MOST_SEGMENTS';
          originDestinationIds: string[];
        }[];
        carrierRestrictions?: {
          includedCarrierCodes?: string[];
          excludedCarrierCodes?: string[];
        };
      };
    };
  };

  // https://github.com/amadeus4dev/amadeus-code-examples/blob/master/flight_offers_search/v2/post/response.json
  export type FlightOffer = {
    type: 'flight-offer';
    id: string; // TODO(burdon): Only session ID?
    source: string;
    oneWay: boolean;
    lastTicketingDate: string;
    numberOfBookableSeats: number;

    itineraries: {
      duration: string; // PT9H40M

      // Multiple segments if not-direct.
      segments: {
        id: string; // TODO(burdon): Reference originDestinations?
        numberOfStops: number;
        duration: string; // PT9H40M
        blacklistedInEU: boolean; // TODO(burdon): ???
        departure: {
          iataCode: string;
          terminal: string;
          at: string; // 2023-03-18T17:25:00
        };
        arrival: {
          iataCode: string;
          terminal: string;
          at: string;
        };
        carrierCode: string;
        number: string;
        aircraft: {
          code: string;
        };
        operating: {
          carrierCode: string;
        };
      }[];
    }[];

    price: {
      currency: string;
      total: string;
      base: string;
      fees: {
        amount: string;
        type: string;
      }[];
    };

    pricingOptions: {
      fareType: string[]; // PUBLISHED
    };

    validatingAirlineCodes: string[];

    travelerPricings: {
      travelerId: string;
      fareOption: string; // STANDARD
      travelerType: string; // ADULT
      // TODO(burdon): price (factor out type above).
    }[];
  };

  export type Config = {
    clientId: string;
    clientSecret: string;
  };

  export type Response<T> = {
    data: T;
  };

  // https://github.com/amadeus4dev/amadeus-node
  export class Amadeus {
    constructor(config: Config);

    referenceData: {
      locations: {
        // /v1/reference-data/locations/airports
        // https://github.com/amadeus4dev/amadeus-code-examples/blob/master/airport_and_city_search/v1/get/locations/response.json
        airports: {
          get: (location: Geolocation) => Promise<Response<Location[]>>;
        };

        // /v1/reference-data/locations/cities
        cities: {
          get: ({ keyword: string }) => Promise<Response<Location[]>>;
        };
      };
    };

    // TODO(burdon): flights.
    // TODO(burdon): hotels.

    shopping: {
      // /v1/shopping/flight-offers
      flightOffersSearch: {
        post: (body: string) => Promise<Response<FlightOffer[]>>;
      };
    };
  }

  export default Amadeus;
}
