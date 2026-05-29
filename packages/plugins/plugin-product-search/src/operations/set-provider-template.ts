//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import type * as Types from 'effect/Types';

import { Operation } from '@dxos/compute';
import { Database, type JsonSchema, Obj, Ref } from '@dxos/echo';

import { Provider, SearchOperation } from '../types';

/**
 * Pure: applies a derived template (search schema + request + result mappings)
 * onto an existing provider via `Obj.update`. Extracted so it can be exercised
 * directly from unit tests without an Operation runtime.
 */
export const applyProviderTemplate = (
  provider: Provider.Provider,
  template: {
    searchSchema: JsonSchema.JsonSchema;
    request: Provider.RequestMapping;
    result: Provider.ResultMapping;
  },
): void => {
  Obj.update(provider, (provider) => {
    // `JsonSchema.JsonSchema` is a deeply-readonly Effect Schema type, but the ECHO
    // mutable proxy setter expects the deeply-mutable variant. The value is stored
    // verbatim, so this readonly -> mutable coercion at the ECHO boundary is safe
    // (mirrors the `Types.DeepMutable<JsonSchemaType>` usage in @dxos/schema).
    provider.searchSchema = template.searchSchema as Types.DeepMutable<JsonSchema.JsonSchema>;
    provider.request = template.request;
    provider.result = template.result;
  });
};

const handler: Operation.WithHandler<typeof SearchOperation.SetProviderTemplate> =
  SearchOperation.SetProviderTemplate.pipe(
    Operation.withHandler(
      Effect.fnUntraced(function* ({ provider: providerRef, searchSchema, request, result }) {
        const provider = yield* Database.load(providerRef);
        applyProviderTemplate(provider, { searchSchema, request, result });
        return Ref.make(provider);
      }),
    ),
  );

export default handler;
