//
// Copyright 2024 DXOS.org
//

import * as S from '@effect/schema/Schema';
import { expect } from 'chai';
import { Effect, pipe } from 'effect';
import { isFailType } from 'effect/Cause';
import { isFailure, isSuccess } from 'effect/Exit';

import { describe, test } from '@dxos/test';

import { jsonChat } from './chat';
import { type Context, logger, text, tryFunction } from './pipeline';
import { processTemplate, type Resolver } from './prompt';
import { createChainResources } from '../vendors';

describe('Pipeline', () => {
  test('basic', async () => {
    // TODO(burdon): Port existing function stack.
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

    // TODO(burdon): Signal abstraction.
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

  test('JSON chat', async () => {
    const { model } = createChainResources('ollama');

    const contactSchema = S.struct({
      name: S.string,
    }).pipe(S.description("A person's contact record"));

    const schema = S.struct({
      person: S.array(contactSchema),
    });

    const pipeline = pipe(
      //
      Effect.succeed<Context>({
        request: {
          messages: [
            text(
              'You are a machine that only replies with valid, iterable RFC8259 compliant JSON in your responses.',
              'Your entire response should be a single array of JSON objects.',
              '',
              'Who is the CEO of Microsoft',
            ),
          ],
        },
      }),
      Effect.andThen(tryFunction(logger)),
      Effect.andThen(jsonChat(model, { schema })),
      Effect.mapError((err) => err),
    );

    const result = await Effect.runPromiseExit(pipeline);
    if (isFailure(result)) {
      if (isFailType(result.cause)) {
        // TODO(burdon): dxos.log doesn't log the cause.
        console.error(result.cause.error);
      }
    }

    console.log(JSON.stringify(result, undefined, 2));
  });
});
