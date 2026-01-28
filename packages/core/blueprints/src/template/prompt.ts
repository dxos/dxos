//
// Copyright 2024 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Record from 'effect/Record';
import handlebars from 'handlebars';

import { Database } from '@dxos/echo';
import type { ObjectNotFoundError } from '@dxos/echo/Err';
import {
  type FunctionDefinition,
  FunctionInvocationService,
  type FunctionNotFoundError,
  type TracingService,
} from '@dxos/functions';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';

import type { Template } from '..';

/**
 * Process Handlebars template.
 */
export const process = <Options extends {}>(source: string, variables: Partial<Options> = {}): string => {
  invariant(typeof source === 'string');
  let section = 0;
  handlebars.registerHelper('section', () => String(++section));
  const template = handlebars.compile(source.trim());
  const output = template(variables);
  return output.trim().replace(/(\n\s*){3,}/g, '\n\n');
};

export const processTemplate = (
  template: Template.Template,
): Effect.Effect<string, ObjectNotFoundError | FunctionNotFoundError, FunctionInvocationService | TracingService> =>
  Effect.gen(function* () {
    const functionInvoker = yield* FunctionInvocationService;

    const variables = yield* Effect.forEach(template.inputs ?? [], (input) =>
      Effect.gen(function* () {
        if (input.kind === 'function') {
          const fn = (yield* functionInvoker.resolveFunction(input.function!)) as FunctionDefinition<
            {},
            unknown,
            never
          >;
          const result = yield* functionInvoker.invokeFunction(fn, {});
          return [input.name, result] as const;
        } else {
          return yield* Effect.dieMessage(`Unsupported input kind: ${input.kind}`);
        }
      }),
    ).pipe(Effect.map(Record.fromEntries));

    log('processTemplate', { variables });

    return process((yield* Database.Service.load(template.source)).content, variables);
  });
