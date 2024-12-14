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

export type IntentSchema<Class, Tag extends string, Fields extends IntentParams> = S.TaggedClass<Class, Tag, Fields>;

/**
 * An intent is an abstract description of an operation to be performed.
 * Intents allow actions to be performed across plugins.
 */
export type Intent<
  Tag extends string,
  Fields extends IntentParams,
  Schema extends IntentSchema<any, Tag, Fields> = IntentSchema<any, Tag, Fields>,
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
export const createIntent = <_, Tag extends string, Fields extends IntentParams>(
  schema: IntentSchema<_, Tag, Fields>,
  data: IntentData<Fields>,
  params: Pick<Intent<any, any, any>, 'plugin' | 'undo'> = {},
): Intent<Tag, Fields, IntentSchema<_, Tag, Fields>> => {
  return {
    ...params,
    _schema: schema,
    action: schema._tag,
    data,
  };
};
