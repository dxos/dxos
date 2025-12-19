//
// Copyright 2025 DXOS.org
//

import * as Command from '@effect/cli/Command';
import * as Options from '@effect/cli/Options';
import * as Console from 'effect/Console';
import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { Database, Filter, Obj, Type } from '@dxos/echo';
import { faker } from '@dxos/random';

import { CommandConfig } from '../../services';
import { getSpace, spaceLayer } from '../../util';
import { Common } from '../options';

const pause = (interval: number, jitter: number) =>
  interval > 0
    ? Effect.sleep(Duration.millis(interval + (jitter > 0 ? faker.number.int({ min: 0, max: jitter }) : 0)))
    : Effect.void;

export const handler = Effect.fn(function* ({
  interval,
  jitter,
  objects,
  mutations,
  epoch,
}: {
  interval: number;
  jitter: number;
  objects: number;
  mutations: number;
  epoch: Option.Option<number>;
}) {
  const epochValue = Option.getOrUndefined(epoch);
  const { json } = yield* CommandConfig;

  // Validate inputs
  if (objects < 0) {
    if (json) {
      yield* Console.log(JSON.stringify({ error: 'objects must be non-negative' }, null, 2));
    } else {
      yield* Console.log('Error: objects must be non-negative.');
    }
    return;
  }

  if (mutations < 0) {
    if (json) {
      yield* Console.log(JSON.stringify({ error: 'mutations must be non-negative' }, null, 2));
    } else {
      yield* Console.log('Error: mutations must be non-negative.');
    }
    return;
  }

  if (interval < 0) {
    if (json) {
      yield* Console.log(JSON.stringify({ error: 'interval must be non-negative' }, null, 2));
    } else {
      yield* Console.log('Error: interval must be non-negative.');
    }
    return;
  }

  if (jitter < 0) {
    if (json) {
      yield* Console.log(JSON.stringify({ error: 'jitter must be non-negative' }, null, 2));
    } else {
      yield* Console.log('Error: jitter must be non-negative.');
    }
    return;
  }

  if (epochValue !== undefined && epochValue <= 0) {
    if (json) {
      yield* Console.log(JSON.stringify({ error: 'epoch must be positive' }, null, 2));
    } else {
      yield* Console.log('Error: epoch must be positive.');
    }
    return;
  }

  const type = 'test';

  // Create objects
  for (let i = 0; i < objects; i++) {
    yield* Database.Service.add(Obj.make(Type.Expando, { type, title: faker.lorem.word() }));
    yield* Database.Service.flush({ indexes: true });
    yield* pause(interval, jitter);
  }

  // Query objects and mutate them
  const queriedObjects = yield* Database.Service.runQuery(Filter.type(Type.Expando, { type }));

  if (queriedObjects.length > 0) {
    for (let i = 0; i < mutations; i++) {
      const object = faker.helpers.arrayElement(queriedObjects);
      object.title = faker.lorem.word();
      yield* Database.Service.flush({ indexes: true });
      yield* pause(interval, jitter);

      // Create epoch if specified
      if (epochValue && i % epochValue === 0 && i > 0) {
        const spaceIdValue = yield* Database.Service.spaceId;
        const space = yield* getSpace(spaceIdValue);
        if (space) {
          yield* Effect.tryPromise(() => space.internal.createEpoch());
          yield* Database.Service.flush({ indexes: true });
        }
      }
    }
  }

  if (json) {
    yield* Console.log(
      JSON.stringify(
        {
          success: true,
          objectsCreated: objects,
          mutationsPerformed: mutations,
          totalObjects: queriedObjects.length,
        },
        null,
        2,
      ),
    );
  } else {
    yield* Console.log(`Generated ${objects} objects and performed ${mutations} mutations.`);
  }
});

export const generate = Command.make(
  'generate',
  {
    spaceId: Common.spaceId.pipe(Options.optional),
    interval: Options.integer('interval').pipe(
      Options.withDescription('Interval between mutations (ms).'),
      Options.withDefault(0),
    ),
    jitter: Options.integer('jitter').pipe(Options.withDescription('Interval variance (ms).'), Options.withDefault(0)),
    objects: Options.integer('objects').pipe(Options.withDescription('Number of objects.'), Options.withDefault(0)),
    mutations: Options.integer('mutations').pipe(
      Options.withDescription('Number of mutations.'),
      Options.withDefault(0),
    ),
    epoch: Options.integer('epoch').pipe(Options.withDescription('Number of mutations per epoch.'), Options.optional),
  },
  handler,
)
  .pipe(Command.withDescription('Generate test data.'))
  .pipe(Command.provide(({ spaceId }) => spaceLayer(spaceId, true)));
