//
// Copyright 2023 DXOS.org
//

import { add, formatISO9075 } from 'date-fns';

import { debounce, Trigger } from '@dxos/async';
import { Client } from '@dxos/client';
import { fromHost } from '@dxos/client-services';
import { Config } from '@dxos/config';
import { Trip } from '@dxos/kai-types';
import { describe, test } from '@dxos/test';

import { loadJson } from '../util';
import { TravelBot } from './travel-bot';

describe('TravelBot', () => {
  // eslint-disable-next-line mocha/no-skipped-tests
  test('basic', async () => {
    const config = new Config(loadJson(process.env.TEST_CONFIG!));
    const client = new Client({ config, services: fromHost(config) });
    await client.initialize();
    await client.halo.createIdentity();
    const space = await client.echo.createSpace();

    const bot = new TravelBot();
    await bot.init(client.config, space);
    await bot.start();

    {
      const trigger = new Trigger();

      //
      // TODO(burdon): Called recursively since self-modified.
      //  - Ephemeral query if user is present?
      //  - But in general need async call-and-response pattern. Different objects?
      //

      const query = space.db.query(Trip.filter());
      const unsubscribe = query.subscribe(
        // TODO(burdon): Remove debounce once fixed.
        debounce(({ objects: itineraries }) => {
          // TODO(burdon): Wait for bot to update.
          if (itineraries[0].bookings.length) {
            console.log('result', JSON.stringify(itineraries, undefined, 2));
            trigger.wake();
          }
        }, 100)
      );

      {
        await space.db.add(
          new Trip({
            segments: [
              {
                dateStart: formatISO9075(Date.now(), { representation: 'date' }),
                destination: {
                  code: 'JFK'
                }
              },
              {
                dateStart: formatISO9075(add(Date.now(), { days: 7 }), { representation: 'date' }),
                destination: {
                  code: 'CDG'
                }
              },
              {
                dateStart: formatISO9075(add(Date.now(), { days: 14 }), { representation: 'date' }),
                destination: {
                  code: 'JFK'
                }
              }
            ]
          })
        );
      }

      await trigger.wait();
      unsubscribe();
    }

    await bot.stop();
  });
});
