//
// Copyright 2023 DXOS.org
//

import { add, formatISO9075 } from 'date-fns';
import fs from 'fs';
import { dirname } from 'path';

import { debounce, Trigger } from '@dxos/async';
import { Client } from '@dxos/client';
import { fromHost } from '@dxos/client-services';
import { Config } from '@dxos/config';
import { TravelProfile, Trip } from '@dxos/kai-types';
import { log } from '@dxos/log';
import { describe, test } from '@dxos/test';

import { loadJson } from '../util';
import { TravelBot } from './travel-bot';

// TODO(burdon): Logging config?

describe('TravelBot', () => {
  // eslint-disable-next-line mocha/no-skipped-tests
  test('basic', async () => {
    // TODO(burdon): Config sets up network!
    const config = new Config(loadJson(process.env.TEST_CONFIG!));
    const client = new Client({ config, services: fromHost(config) });
    await client.initialize();
    await client.halo.createIdentity();
    const space = await client.echo.createSpace();

    const bot = new TravelBot();
    await bot.init(client.config, space);
    await bot.start();

    {
      const trigger = new Trigger<Trip>();

      //
      // TODO(burdon): Called recursively since self-modified.
      //  - Ephemeral query if user is present?
      //  - But in general need async call-and-response pattern. Different objects?
      //

      // TODO(burdon): Output input/output to tmp file to view.
      // TODO(burdon): Auto-join bots.

      const query = space.db.query(Trip.filter());
      const unsubscribe = query.subscribe(
        // TODO(burdon): Remove debounce once fixed.
        debounce(({ objects: trips }) => {
          const trip = trips[0];
          if (trip && trip.bookings.length) {
            trigger.wake(trip);
          }
        }, 100)
      );

      const profile: TravelProfile = {
        cabin: 'BUSINESS',
        carriers: ['AA', 'AF', 'LH', 'SQ']
      };

      const now = new Date();

      await space.db.add(
        new Trip({
          updated: now.toISOString(), // TODO(burdon): System property.
          name: '2023-Q2 Europe',
          profile,
          destinations: [
            {
              address: {
                cityCode: 'NYC' // TODO(burdon): From user profile.
              }
            },
            {
              dateStart: formatISO9075(add(now, { days: 7 }), { representation: 'date' }),
              address: {
                cityCode: 'MUC'
              }
            },
            {
              dateStart: formatISO9075(add(now, { days: 10 }), { representation: 'date' }),
              address: {
                cityCode: 'BER'
              }
            },
            {
              dateStart: formatISO9075(add(now, { days: 18 }), { representation: 'date' }),
              address: {
                cityCode: 'NYC'
              }
            }
          ]
        })
      );

      const trip = await trigger.wait();

      const tmpFile = '/tmp/dxos/kai-bots/travel-bot/text.json';
      fs.mkdirSync(dirname(tmpFile), { recursive: true });
      fs.writeFileSync(tmpFile, JSON.stringify({ trip }, undefined, 2));
      log.info('output', { tmpFile });

      unsubscribe();
    }

    await bot.stop();
    await client.destroy();
  });
});
