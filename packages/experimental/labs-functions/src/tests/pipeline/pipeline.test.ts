//
// Copyright 2024 DXOS.org
//

import { expect } from 'chai';
import { Effect, pipe } from 'effect';
import { isFailType } from 'effect/Cause';
import { isFailure, isSuccess } from 'effect/Exit';

import { describe, test } from '@dxos/test';

import { type Context, logger, tryFunction } from './pipeline';
import { processTemplate, type Resolver } from './prompt';

describe.only('Pipeline', () => {
  test('basic', async () => {
    const resolver: Resolver = (input) => {
      switch (input.type) {
        case 'const': {
          return input.value;
        }

        case 'selection': {
          return ['hello world', 'welcome'].join('\n');
        }

        default:
          return null;
      }
    };

    const pipeline = pipe(
      Effect.succeed<Context>({
        request: {
          prompt: {
            template: 'translate the following text into {language}: {content}',
            inputs: [
              {
                name: 'language',
                type: 'const',
                value: 'japanese',
              },
              {
                name: 'content',
                type: 'selection',
              },
            ],
          },
        },
      }),
      Effect.andThen(tryFunction(processTemplate(resolver))),
      Effect.andThen(tryFunction(logger)),
      Effect.mapError((err) => err),
    );

    const result = await Effect.runPromiseExit(pipeline);
    if (isFailure(result)) {
      if (isFailType(result.cause)) {
        // TODO(burdon): dxos.log doesn't log the cause.
        console.error(result.cause.error);
      }
    }

    expect(isSuccess(result)).to.be.true;
  });
});
