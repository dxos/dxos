//
// Copyright 2023 DXOS.org
//

import { S } from '@dxos/echo-schema';

export type IntentParams = {
  readonly input: S.Schema.All;
  readonly output: S.Schema.All;
};

export type IntentData<Fields extends IntentParams> =
  S.Schema.Type<S.Struct<Fields>> extends { readonly input: any } ? S.Schema.Type<S.Struct<Fields>>['input'] : any;

export type IntentResultData<Fields extends IntentParams> =
  S.Schema.Type<S.Struct<Fields>> extends { readonly output: any } ? S.Schema.Type<S.Struct<Fields>>['output'] : any;

export type IntentSchema<Tag extends string, Fields extends IntentParams> = S.TaggedClass<any, Tag, Fields>;

/**
 * An intent is an abstract description of an operation to be performed.
 * Intents allow actions to be performed across plugins.
 */
export type Intent<Tag extends string, Fields extends IntentParams> = {
  _schema: IntentSchema<Tag, Fields>;

  /**
   * The action to perform.
   */
  action: Tag;

  /**
   * Any data needed to perform the desired action.
   */
  data: IntentData<Fields>;

  /**
   * Plugin ID.
   * If specified, the intent will be sent explicitly to the plugin.
   * Otherwise, the intent will be sent to all plugins, in order and the first to resolve a non-null value will be used.
   */
  plugin?: string;

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
  data?: IntentData<Fields>,
  params: Pick<AnyIntent, 'plugin' | 'undo'> = {},
): IntentChain<Tag, Tag, Fields, Fields> => {
  const intent = {
    ...params,
    _schema: schema,
    action: schema._tag,
    // TODO(wittjosiah): Is there a better way to make theses types align?
    data: S.validateSync(schema.fields.input as S.Schema<any, any, unknown>)(data),
  } satisfies Intent<Tag, Fields>;

  return {
    first: intent,
    last: intent,
    all: [intent],
  };
};

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
    data: Omit<IntentData<NextFields>, keyof IntentResultData<LastFields>>,
    params: Pick<AnyIntent, 'plugin' | 'undo'> = {},
  ) =>
  (
    intent: IntentChain<FirstTag, any, FirstFields, LastFields>,
  ): IntentChain<FirstTag, NextTag, FirstFields, NextFields> => {
    const intents = 'all' in intent ? intent.all : [intent];
    const first = intents[0];
    const last = {
      ...params,
      _schema: schema,
      action: schema._tag,
      data,
    } satisfies Intent<NextTag, NextFields>;

    return {
      first,
      last,
      all: [...intents, last],
    };
  };
