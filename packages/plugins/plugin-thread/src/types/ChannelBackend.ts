//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import * as SchemaAST from 'effect/SchemaAST';

import * as ThreadCapabilities from './ThreadCapabilities';

/** Finds the provider matching a `Channel.backend.kind`. */
export const resolveProvider = (
  providers: readonly ThreadCapabilities.ChannelBackendProvider[],
  kind: string,
): ThreadCapabilities.ChannelBackendProvider | undefined => providers.find((provider) => provider.kind === kind);

/** Throws if two providers share a `kind` (which would make resolution order-dependent). */
export const assertUniqueKinds = (providers: readonly ThreadCapabilities.ChannelBackendProvider[]): void => {
  const seen = new Set<string>();
  for (const provider of providers) {
    if (seen.has(provider.kind)) {
      throw new Error(`Duplicate channel backend kind: ${provider.kind}`);
    }
    seen.add(provider.kind);
  }
};

/**
 * Builds the create-channel form schema from the registered providers.
 *
 * With a single provider whose create-fields are empty the form is just a
 * `name` field (today's behaviour). With multiple providers (or extra fields)
 * it becomes `{ name?, backend: Union(<{ kind: Literal(p.kind) } & p.createFields>) }`,
 * which react-ui-form renders as a `kind` Select plus the selected branch's fields.
 */
export const buildChannelFormSchema = (
  providers: readonly ThreadCapabilities.ChannelBackendProvider[],
): Schema.Schema.AnyNoContext => {
  assertUniqueKinds(providers);
  const needsSelector = providers.length > 1 || providers.some((provider) => fieldCount(provider.createFields) > 0);
  if (!needsSelector) {
    return Schema.Struct({ name: Schema.optional(Schema.String) });
  }

  const branches = providers.map((provider) =>
    Schema.extend(Schema.Struct({ kind: Schema.Literal(provider.kind) }), provider.createFields),
  );
  const backend = branches.length === 1 ? branches[0] : Schema.Union(...branches);
  return Schema.Struct({
    name: Schema.optional(Schema.String),
    backend,
  });
};

const fieldCount = (schema: Schema.Schema.AnyNoContext): number => SchemaAST.getPropertySignatures(schema.ast).length;
