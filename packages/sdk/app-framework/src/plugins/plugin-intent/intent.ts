//
// Copyright 2023 DXOS.org
//

import { type S } from '@dxos/echo-schema';

export type IntentParams = S.Struct.Fields;
// TODO(wittjosiah): Specifying this further causes a type error.
// {
//   readonly input: S.Schema<{ readonly [key: string]: unknown }>;
//   readonly output: S.Schema<{ readonly [key: string]: unknown }>;
// };

export type IntentData<T extends IntentParams> =
  S.Schema.Type<S.Struct<T>> extends { input: any } ? S.Schema.Type<S.Struct<T>>['input'] : any;

export type IntentResultData<T extends IntentParams> =
  S.Schema.Type<S.Struct<T>> extends { output: any } ? S.Schema.Type<S.Struct<T>>['output'] : any;

export type IntentSchema<Tag extends string, Fields extends IntentParams> = S.TaggedClass<any, Tag, Fields>;

/**
 * An intent is an abstract description of an operation to be performed.
 * Intents allow actions to be performed across plugins.
 */
export type Intent<
  Tag extends string,
  Fields extends IntentParams,
  Schema extends IntentSchema<Tag, Fields> = IntentSchema<Tag, Fields>,
> = {
  _schema: Schema;

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
 * Creates a typed intent.
 * @param schema Schema of the intent. Must be a tagged class with input and output schemas.
 * @param data Data fulfilling the input schema of the intent.
 * @param params.plugin Optional plugin ID to send the intent to.
 * @param params.undo Optional flag to indicate that the intent is being undone. Generally not set manually.
 */
export const createIntent = <Tag extends string, Fields extends IntentParams>(
  schema: IntentSchema<Tag, Fields>,
  data: IntentData<Fields>,
  params: Pick<AnyIntent, 'plugin' | 'undo'> = {},
): Intent<Tag, Fields> => {
  return {
    ...params,
    _schema: schema,
    action: schema._tag,
    data,
  };
};

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

/**
 * Chain two intents together.
 */
export const chain =
  <TagA extends string, TagB extends string, FieldsA extends IntentParams, FieldsB extends IntentParams>(
    schema: IntentSchema<TagB, FieldsB>,
    data: Omit<IntentData<FieldsB>, keyof IntentResultData<FieldsA>>,
    params: Pick<AnyIntent, 'plugin' | 'undo'> = {},
  ) =>
  (
    intent: Intent<TagA, FieldsA> | IntentChain<TagA, any, any, any>,
  ): IntentChain<TagA, TagB, IntentData<FieldsA>, IntentResultData<FieldsB>> => {
    const intents = 'all' in intent ? intent.all : [intent];
    const first = intents[0];
    const last = {
      ...params,
      _schema: schema,
      action: schema._tag,
      data,
    } satisfies Intent<TagB, FieldsB>;

    return {
      first,
      last,
      all: [...intents, last],
    };
  };
