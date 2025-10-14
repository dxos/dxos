//
// Copyright 2023 DXOS.org
//

import * as Schema from 'effect/Schema';

export type IntentParams = {
  readonly input: Schema.Schema.All;
  readonly output: Schema.Schema.All;
};

export type IntentData<Fields extends IntentParams> =
  Schema.Schema.Type<Schema.Struct<Fields>> extends { readonly input: any }
    ? Schema.Schema.Type<Schema.Struct<Fields>>['input']
    : any;

export type IntentResultData<Fields extends IntentParams> =
  Schema.Schema.Type<Schema.Struct<Fields>> extends { readonly output: any }
    ? Schema.Schema.Type<Schema.Struct<Fields>>['output']
    : any;

export type IntentSchema<Tag extends string, Fields extends IntentParams> = Schema.TaggedClass<any, Tag, Fields>;

/**
 * An intent is an abstract description of an operation to be performed.
 * Intents allow actions to be performed across plugins.
 */
export type Intent<Tag extends string, Fields extends IntentParams> = {
  _schema: IntentSchema<Tag, Fields>;

  /**
   * The id of the intent.
   */
  id: Tag;

  /**
   * Any data needed to perform the desired action.
   */
  data: IntentData<Fields>;

  /**
   * Whether or not the intent is being undone.
   */
  undo?: boolean;
};

export type AnyIntent = Intent<any, any>;

/**
 * Chain of intents to be executed together.
 * The result of each intent is merged into the next intent's input data.
 */
export type IntentChain<
  FirstTag extends string,
  LastTag extends string,
  FirstFields extends IntentParams,
  LastFields extends IntentParams,
> = {
  first: Intent<FirstTag, FirstFields>;
  last: Intent<LastTag, LastFields>;
  all: AnyIntent[];
};

export type AnyIntentChain = IntentChain<any, any, any, any>;

/**
 * Creates a typed intent.
 * @param schema Schema of the intent. Must be a tagged class with input and output schemas.
 * @param data Data fulfilling the input schema of the intent.
 * @param params.plugin Optional plugin ID to send the intent to.
 * @param params.undo Optional flag to indicate that the intent is being undone. Generally not set manually.
 */
export const createIntent = <Tag extends string, Fields extends IntentParams>(
  schema: IntentSchema<Tag, Fields>,
  data: IntentData<Fields> = {},
  params: Pick<AnyIntent, 'undo'> = {},
): IntentChain<Tag, Tag, Fields, Fields> => {
  // The output of validateSync breaks proxy objects so this is just used for validation.
  // TODO(wittjosiah): Is there a better way to make theses types align?
  const _ = Schema.validateSync(schema.fields.input as Schema.Schema<any, any, unknown>)(data);
  const intent = {
    ...params,
    _schema: schema,
    id: schema._tag,
    data,
  } satisfies Intent<Tag, Fields>;

  return {
    first: intent,
    last: intent,
    all: [intent],
  };
};

// TODO(wittjosiah): Add a function for mapping the output of one intent to the input of another.

/**
 * Chain two intents together.
 *
 * NOTE: Chaining of intents depends on the data inputs and outputs being structs.
 */
export const chain =
  <
    FirstTag extends string,
    NextTag extends string,
    FirstFields extends IntentParams,
    LastFields extends IntentParams,
    NextFields extends IntentParams,
  >(
    schema: IntentSchema<NextTag, NextFields>,
    data: Omit<IntentData<NextFields>, keyof IntentResultData<LastFields>> = {},
    params: Pick<AnyIntent, 'undo'> = {},
  ) =>
  (
    intent: IntentChain<FirstTag, any, FirstFields, LastFields>,
  ): IntentChain<FirstTag, NextTag, FirstFields, NextFields> => {
    const intents = 'all' in intent ? intent.all : [intent];
    const first = intents[0];
    const last = {
      ...params,
      _schema: schema,
      id: schema._tag,
      data,
    } satisfies Intent<NextTag, NextFields>;

    return {
      first,
      last,
      all: [...intents, last],
    };
  };

//
// Intents
//

// NOTE: Should maintain compatibility with `i18next` (and @dxos/react-ui).
// TODO(wittjosiah): Making this immutable breaks type compatibility.
export const Label = Schema.Union(
  Schema.String,
  Schema.mutable(
    Schema.Tuple(
      Schema.String,
      Schema.mutable(
        Schema.Struct({
          ns: Schema.String,
          count: Schema.optional(Schema.Number),
          defaultValue: Schema.optional(Schema.String),
        }),
      ),
    ),
  ),
);
export type Label = Schema.Schema.Type<typeof Label>;
