//
// Copyright 2023 DXOS.org
//

import * as Schema from 'effect/Schema';

export type IntentProps = {
  readonly input: Schema.Schema.All;
  readonly output: Schema.Schema.All;
};

export type IntentData<Fields extends IntentProps> =
  Schema.Schema.Type<Schema.Struct<Fields>> extends { readonly input: any }
    ? Schema.Schema.Type<Schema.Struct<Fields>>['input']
    : any;

export type IntentResultData<Fields extends IntentProps> =
  Schema.Schema.Type<Schema.Struct<Fields>> extends { readonly output: any }
    ? Schema.Schema.Type<Schema.Struct<Fields>>['output']
    : any;

export type IntentSchema<Tag extends string, Fields extends IntentProps> = Schema.TaggedClass<any, Tag, Fields>;

/**
 * An intent is an abstract description of an operation to be performed.
 * Intents allow actions to be performed across plugins.
 */
export type Intent<Tag extends string, Fields extends IntentProps> = {
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
 * Creates a typed intent.
 * @param schema Schema of the intent. Must be a tagged class with input and output schemas.
 * @param data Data fulfilling the input schema of the intent.
 * @param params.undo Optional flag to indicate that the intent is being undone. Generally not set manually.
 */
export const createIntent = <Tag extends string, Fields extends IntentProps>(
  schema: IntentSchema<Tag, Fields>,
  data: IntentData<Fields> = {},
  params: Pick<AnyIntent, 'undo'> = {},
): Intent<Tag, Fields> => {
  // The output of validateSync breaks proxy objects so this is just used for validation.
  const _ = Schema.validateSync(schema.fields.input as Schema.Schema<any, any, unknown>)(data);
  return {
    ...params,
    _schema: schema,
    id: schema._tag,
    data,
  } satisfies Intent<Tag, Fields>;
};

//
// Intents
//

// NOTE: Should maintain compatibility with `i18next` (and @dxos/react-ui).
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
