//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { type ChannelBackendProvider } from './ThreadCapabilities';

/** Finds the provider matching a `Channel.backend.kind`. */
export const resolveProvider = (
  providers: readonly ChannelBackendProvider[],
  kind: string,
): ChannelBackendProvider | undefined => providers.find((provider) => provider.kind === kind);

/**
 * Builds the create-channel form schema from the registered providers.
 *
 * With a single provider whose create-fields are empty the form is just a
 * `name` field (today's behaviour). With multiple providers (or extra fields)
 * it becomes `{ name?, backend: Union(<{ kind: Literal(p.kind), ...p.createFields }>) }`,
 * which react-ui-form renders as a `kind` Select plus the selected branch's fields.
 */
export const buildChannelFormSchema = (providers: readonly ChannelBackendProvider[]): Schema.Schema.AnyNoContext => {
  const needsSelector = providers.length > 1 || providers.some((provider) => hasFields(provider.createFields));
  if (!needsSelector) {
    return Schema.Struct({ name: Schema.optional(Schema.String) });
  }

  const branches = providers.map((provider) =>
    Schema.Struct({ kind: Schema.Literal(provider.kind), ...provider.createFields.fields }),
  );
  const backend =
    branches.length === 1 ? branches[0] : Schema.Union(...(branches as [Schema.Struct<any>, ...Schema.Struct<any>[]]));
  return Schema.Struct({
    name: Schema.optional(Schema.String),
    backend,
  });
};

const hasFields = (struct: Schema.Struct<any>): boolean => Object.keys(struct.fields).length > 0;
