//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Database, Filter, Query } from '@dxos/echo';
import { Person } from '@dxos/types';

/**
 * Attempts to match the given source to a target object using the provided resolution logic.
 */
export type Resolver<Source, Target, E = never, R = never> = (
  source: Source,
) => Effect.Effect<Target | undefined, E, R>;

export type ResolverDefinition = { source: unknown; target: unknown };

export type ResolverDefinitionMap = Record<string, ResolverDefinition>;

export type ResolverKind<D extends ResolverDefinitionMap> = keyof D & string;

/**
 * Map of resolver effects indexed by resolver kind.
 */
export type ResolverMap<D extends ResolverDefinitionMap, K extends ResolverKind<D> = ResolverKind<D>> = {
  [P in K]: Resolver<D[P]['source'], D[P]['target'] | undefined>;
};

//
// TODO(burdon): Factor out implementation.
//

export type HasEmail = { email: string };

export type InboxResolverDefinitions = {
  contact: { source: HasEmail; target: Person.Person };
};

export const createContactResolver = Effect.gen(function* () {
  // Cached contacts.
  const contacts = yield* Database.Service.runQuery(Query.select(Filter.type(Person.Person)));
  const resolver: Resolver<HasEmail, Person.Person> = ({ email }) =>
    Effect.succeed(contacts.find((contact) => contact.emails?.some(({ value }) => value === email)));

  return resolver;
});

export const createInboxResolverMap = Effect.gen(function* () {
  return {
    contact: yield* createContactResolver,
  } satisfies ResolverMap<InboxResolverDefinitions>;
});
