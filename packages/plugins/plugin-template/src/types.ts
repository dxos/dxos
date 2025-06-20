//
// Copyright 2023 DXOS.org
//

import { Schema } from 'effect';

import { TypedObject } from '@dxos/echo-schema';
import { isEchoObject, ReactiveObjectSchema, type AnyLiveObject } from '@dxos/react-client/echo';

import { TEMPLATE_PLUGIN } from './meta';

export namespace TemplateAction {
  const TEMPLATE_ACTION = `${TEMPLATE_PLUGIN}/action`;

  export class Create extends Schema.TaggedClass<Create>()(`${TEMPLATE_ACTION}/create`, {
    input: Schema.Struct({
      name: Schema.optional(Schema.String),
    }),
    output: Schema.Struct({
      object: ReactiveObjectSchema,
    }),
  }) {}
}

// TODO(burdon): Warning: Encountered two children with the same key, `dxos.org/plugin/template`.
// TODO(burdon): Better way to detect?
export const isObject = (object: unknown): object is AnyLiveObject<any> => {
  return isEchoObject(object) && object.type === 'template';
};

export class TemplateType extends TypedObject({ 
  typename: 'dxos.org/type/Template', 
  version: '0.1.0',
})({
  name: Schema.optional(Schema.String),
}) {}
