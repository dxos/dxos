//
// Copyright 2024 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { Database, DXN, Filter, Ref, Registry } from '@dxos/echo';
import type { EntityNotFoundError } from '@dxos/echo/Err';
import { assertArgument, invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { Text } from '@dxos/schema';
import Handlebars from '@dxos/vendor-kbn-handlebars';

import { FunctionNotFoundError } from './errors';
import * as Operation from './Operation';

/**
 * Template input kind determines how template variables are resolved.
 */
export const InputKind = Schema.Literal(
  'value', // Literal value.
  'operation',
  // 'pass-through',
  // 'retriever',
  // 'query',
  // 'resolver',
  // 'context',
  // 'schema',
);

export type InputKind = Schema.Schema.Type<typeof InputKind>;

/**
 * Template input variable.
 * E.g., {{foo}}
 */
export const Input = Schema.Struct({
  name: Schema.String,
  kind: InputKind,
  default: Schema.optional(Schema.Any),
  /**
   * Operation key invoked when `kind === 'operation'`. The referenced operation must accept void input —
   * template inputs have no mechanism for passing arguments.
   */
  operation: Schema.optional(Schema.String),
});

export type Input = Schema.Schema.Type<typeof Input>;

/**
 * Template type.
 */
export const Template = Schema.Struct({
  source: Ref.Ref(Text.Text).annotations({ description: 'Markdown + Handlebars template.' }),

  /**
   * NOTE: We use an array rather than map so that updating variable names in the template doesn't disconnect existing inputs.
   */
  inputs: Schema.optional(Schema.Array(Input)),
});

export type Template = Schema.Schema.Type<typeof Template>;

export type MakeProps = Partial<{ id: string; source: string; inputs: Input[] }>;

export const make = ({ id, source, inputs = [] }: MakeProps = {}): Template => ({
  source: Ref.make(Text.make({ id, content: source })),
  inputs,
});

/**
 * Process Handlebars template.
 */
export const process = <Options extends {}>(source: string, variables: Partial<Options> = {}): string => {
  assertArgument(typeof source === 'string', 'source');
  let section = 0;
  const handlebars = Handlebars.create();
  handlebars.registerHelper('section', () => String(++section));
  const template = handlebars.compileAST(source.trim());
  const output = template(variables);
  return output.trim().replace(/(\n\s*){3,}/g, '\n\n');
};

export const processTemplate = (
  template: Template,
): Effect.Effect<string, EntityNotFoundError | FunctionNotFoundError, Registry.Service | Operation.Service> =>
  Effect.gen(function* () {
    const entries = yield* Effect.forEach(template.inputs ?? [], (input) =>
      Effect.gen(function* () {
        switch (input.kind) {
          case 'value': {
            return [input.name, input.default] as const;
          }

          case 'operation': {
            invariant(input.operation);
            // Normalize to a full DXN key so Filter.key matches the stored meta key.
            const key = DXN.isDXN(input.operation) ? input.operation : `dxn:${input.operation}`;
            const results = yield* Registry.runQuery(
              Filter.and(Filter.type(Operation.PersistentOperation), Filter.key(key)),
            );
            if (results.length === 0) {
              return yield* Effect.fail(new FunctionNotFoundError(input.operation));
            }

            // NOTE: Operations referenced by template inputs must accept void input — see `Input.operation`.
            const fn = Operation.deserialize(results[0]);
            const result = yield* Operation.invoke(fn, undefined as any).pipe(Effect.orDie);
            return [input.name, result] as const;
          }

          default: {
            return yield* Effect.dieMessage(`Unsupported input kind: ${input.kind}`);
          }
        }
      }),
    );

    const variables = Object.fromEntries(entries);

    log('processTemplate', { variables });
    return process((yield* Database.load(template.source)).content, variables);
  });
