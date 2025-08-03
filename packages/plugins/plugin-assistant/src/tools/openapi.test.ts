//
// Copyright 2025 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { log } from '@dxos/log';

import { ChatProcessor } from '../hooks';
import { type ApiAuthorization } from '../types';

import { createToolsFromApi, resolveAuthorization } from './openapi';

describe.skip('openapi', () => {
  describe.skip('mapping', () => {
    test('amadeus flight availabilities', async () => {
      const tools = await createToolsFromApi(FLIGHT_SEARCH_API);
      log.info('tools', { tools });
      // for (const tool of tools) {
      //   const schema = tool.parameters;
      //   // log.info('schema', { schema });
      // }
    });

    test('amadeus hotel search', async () => {
      const tools = await createToolsFromApi(HOTEL_SEARCH_API);
      log.info('tools', { tools });
    });

    test('amadeus hotel name autocomplete', async () => {
      const tools = await createToolsFromApi(HOTEL_NAME_AUTOCOMPLETE_API);
      log.info('tools', { tools });
    });

    test('weather', async () => {
      const tools = await createToolsFromApi(WEATHER_API, { authorization: VISUAL_CROSSING_CREDENTIALS });
      log.info('tools', { tools });
    });
  });

  describe.skip('invoke tools', () => {
    test('amadeus hotel name autocomplete', async () => {
      const tools = await createToolsFromApi(HOTEL_NAME_AUTOCOMPLETE_API, { authorization: AMADEUS_AUTH });
      const result = await tools[0].execute(
        {
          keyword: 'William Vale Brooklyn',
          subType: ['HOTEL_LEISURE', 'HOTEL_GDS'],
          countryCode: 'US',
        },
        {},
      );

      log.info('result', { result });
    });

    test('weather API', async () => {
      const tools = await createToolsFromApi(WEATHER_API, { authorization: VISUAL_CROSSING_CREDENTIALS });
      const forecastTool = tools.find((tool) => tool.name.includes('forecast'));
      const result = await forecastTool?.execute(
        {
          locations: 'Brooklyn, NY',
          aggregateHours: '24',
        },
        {},
      );

      log.info('result', { result });
    });
  });

  describe.skip('AI uses tools', () => {
    test('amadeus flight availabilities', { timeout: 60_000 }, async () => {
      const tools = await createToolsFromApi(FLIGHT_SEARCH_API, { authorization: AMADEUS_AUTH });
      // const aiClient = new Edge AiServiceClient({ endpoint: AI_SERVICE_ENDPOINT.LOCAL });
      // TODO(dmaretskyi): FIX ME.
      const processor = new ChatProcessor(null as any, null as any, { tools });
      const reply = await processor.request(
        `What is the cheapest flight from New York to Paris? going on ${new Date().toISOString()} and returning after a week. 1 adult traveler`,
      );

      log.info('reply', { reply });
    });

    // TODO(dmaretskyi): Doesn't work.
    test('amadeus hotel name autocomplete', { timeout: 60_000 }, async () => {
      const tools = await createToolsFromApi(HOTEL_NAME_AUTOCOMPLETE_API, { authorization: AMADEUS_AUTH });
      // const aiClient = new Edge AiServiceClient({ endpoint: AI_SERVICE_ENDPOINT.LOCAL });
      // TODO(dmaretskyi): FIX ME.
      const processor = new ChatProcessor(null as any, null as any, { tools });
      const reply = await processor.request('Find me the William Wale in Brooklyn New York');

      log.info('reply', { reply });
    });

    test.only('weather forecast', { timeout: 60_000 }, async () => {
      const tools = await createToolsFromApi(WEATHER_API, {
        authorization: VISUAL_CROSSING_CREDENTIALS,
        instructions: WEATHER_INSTRUCTIONS,
      });
      // const aiClient = new Edge AiServiceClient({ endpoint: AI_SERVICE_ENDPOINT.LOCAL });
      // TODO(dmaretskyi): FIX ME.
      const processor = new ChatProcessor(null as any, null as any, { tools });
      const reply = await processor.request(
        `Today's date is ${new Date().toISOString().split('T')[0]}. Give me weather forecast for Warsaw for next 5 days.`,
      );

      log.info('reply', { reply });
    });
  });

  describe.skip('invoke api directly', { timeout: 10_000 }, () => {
    test('amadeus flight availabilities', async () => {
      const response = await fetch('https://test.api.amadeus.com/v1/shopping/availability/flight-availabilities', {
        method: 'POST',
        headers: {
          accept: 'application/vnd.amadeus+json',
          'X-HTTP-Method-Override': 'GET',
          'Content-Type': 'application/vnd.amadeus+json',
          Authorization: await resolveAuthorization(AMADEUS_AUTH),
        },
        body: JSON.stringify({
          originDestinations: [
            {
              departureDateTime: {
                date: new Date().toISOString().split('T')[0],
                time: new Date().toTimeString().split(' ')[0],
              },
              destinationLocationCode: 'MAD',
              id: '1',
              originLocationCode: 'BOS',
            },
          ],
          sources: ['GDS'],
          travelers: [
            {
              id: '1',
              travelerType: 'ADULT',
            },
          ],
        }),
      });

      log.info('response', { status: response.status, body: await response.json() });
      expect(response.status).toBe(200);
    });

    test.only('amadeus hotel name autocomplete', async () => {
      const response = await fetch(
        'https://test.api.amadeus.com/v1/reference-data/locations/hotel?keyword=PARI&subtype=HOTEL_LEISURE,HOTEL_GDS',
        {
          method: 'GET',
          headers: {
            // accept: 'application/vnd.amadeus+json',
            // 'X-HTTP-Method-Override': 'GET',
            Authorization: await resolveAuthorization(AMADEUS_AUTH),
          },
        },
      );

      log.info('response', { status: response.status, body: await response.json() });
      expect(response.status).toBe(200);
    });
  });

  describe.skip('rapidapi', () => {
    test('amadeus flight availabilities', async () => {
      const departureDate = new Date().toISOString().split('T')[0];
      const arrivalDate = new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const url = `https://amadeus-api2.p.rapidapi.com/serpapi-flight-search?departure_id=PEK&arrival_id=AUS&outbound_date=${departureDate}&return_date=${arrivalDate}&currency=USD&hl=en`;
      const options = {
        method: 'GET',
        headers: {
          'x-rapidapi-key': RAPID_API_CREDENTIALS.key,
          'x-rapidapi-host': 'amadeus-api2.p.rapidapi.com',
        },
      };

      const response = await fetch(url, options);
      log.info('response', { status: response.status, body: await response.json() });
      expect(response.status).toBe(200);
    });
  });
});

const FLIGHT_SEARCH_API =
  'https://api.apis.guru/v2/specs/amadeus.com/amadeus-flight-availabilities-search/1.0.2/swagger.json';
const HOTEL_SEARCH_API = 'https://api.apis.guru/v2/specs/amadeus.com/amadeus-hotel-search/3.0.8/swagger.json';
const HOTEL_NAME_AUTOCOMPLETE_API =
  'https://api.apis.guru/v2/specs/amadeus.com/amadeus-hotel-name-autocomplete/1.0.3/swagger.json';
const WEATHER_API = 'https://api.apis.guru/v2/specs/visualcrossing.com/weather/4.6/openapi.json';

const WEATHER_INSTRUCTIONS = `
  If the user doesn't provide a date, use today's date.
  Make sure to provide the start and end dates when possible to reduce the amount of data returned.
  Use the tool that accepts the date parameters.
`;

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

const RAPID_API_CREDENTIALS = {
  key: '92271b6740msh32fd821d70f050dp16665bjsna69195c9e838',
};
