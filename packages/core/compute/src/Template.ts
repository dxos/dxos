//
// Copyright 2024 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Record from 'effect/Record';
import * as Schema from 'effect/Schema';

import { Database, Ref } from '@dxos/echo';
import type { ObjectNotFoundError } from '@dxos/echo/Err';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { Text } from '@dxos/schema';
import handlebars from 'handlebars';

import { FunctionNotFoundError } from './Err';
import * as Operation from './Operation';
import * as OperationRegistry from './OperationRegistry';

/**
 * Template input kind determines how template variables are resolved.
 */
export const InputKind = Schema.Literal(
  'value', // Literal value.
  'pass-through',
  'retriever',
  'function',
  'query',
  'resolver',
  'context',
  'schema',
);

export type InputKind = Schema.Schema.Type<typeof InputKind>;

/**
 * Template input variable.
 * E.g., {{foo}}
 */
export const Input = Schema.Struct({
  name: Schema.String,
  kind: Schema.optional(InputKind),
  default: Schema.optional(Schema.Any),

  /**
   * Function to call if the kind is 'function'.
   */
  function: Schema.optional(Schema.String),
});

export type Input = Schema.Schema.Type<typeof Input>;

/**
 * Template type.
 */
export const Template = Schema.Struct({
  source: Ref.Ref(Text.Text).annotations({ description: 'Handlebars template source' }),
  inputs: Schema.optional(Schema.Array(Input)),
});

export interface Template extends Schema.Schema.Type<typeof Template> {}

export const make = ({
  id,
  source,
  inputs = [],
}: { id?: string; source?: string; inputs?: Input[] } = {}): Template => ({
  source: Ref.make(Text.make({ id, content: source })),
  inputs,
});

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
  template: Template,
): Effect.Effect<string, ObjectNotFoundError | FunctionNotFoundError, OperationRegistry.Service | Operation.Service> =>
  Effect.gen(function* () {
    const variables = yield* Effect.forEach(template.inputs ?? [], (input) =>
      Effect.gen(function* () {
        if (input.kind === 'function') {
          const fn = yield* OperationRegistry.resolve(input.function!).pipe(
            Effect.flatten,
            Effect.catchTag('NoSuchElementException', () => Effect.fail(new FunctionNotFoundError(input.function!))),
          );
          const result = yield* Operation.invoke(fn, {} as any).pipe(Effect.orDie);
          return [input.name, result] as const;
        } else {
          return yield* Effect.dieMessage(`Unsupported input kind: ${input.kind}`);
        }
      }),
    ).pipe(Effect.map(Record.fromEntries));

    log('processTemplate', { variables });
    return process((yield* Database.load(template.source)).content, variables);
  });
