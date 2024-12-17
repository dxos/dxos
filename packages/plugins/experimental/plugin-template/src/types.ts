//
// Copyright 2023 DXOS.org
//

import type {
  IntentResolverProvides,
  TranslationsProvides,
  SurfaceProvides,
  MetadataRecordsProvides,
} from '@dxos/app-framework';
import { S } from '@dxos/echo-schema';
import { EchoObjectSchema, isEchoObject, type ReactiveEchoObject } from '@dxos/react-client/echo';

import { TEMPLATE_PLUGIN } from './meta';

export namespace TemplateAction {
  const TEMPLATE_ACTION = `${TEMPLATE_PLUGIN}/action`;

  export class Create extends S.TaggedClass<Create>()(`${TEMPLATE_ACTION}/create`, {
    input: S.Struct({
      name: S.optional(S.String),
    }),
    output: S.Struct({
      object: EchoObjectSchema,
    }),
  }) {}
}

export type TemplatePluginProvides = SurfaceProvides &
  IntentResolverProvides &
  MetadataRecordsProvides &
  TranslationsProvides;

// TODO(burdon): Warning: Encountered two children with the same key, `dxos.org/plugin/template`.
// TODO(burdon): Better way to detect?
export const isObject = (object: unknown): object is ReactiveEchoObject<any> => {
  return isEchoObject(object) && object.type === 'template';
};
