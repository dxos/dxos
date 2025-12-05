//
// Copyright 2025 DXOS.org
//

import { type Person } from '@dxos/types';

export type Resolver<Source, Target> = (source: Source) => Promise<Target | undefined>;

/**
 * Defines the source and target types for each resolver kind.
 */
export type ResolverDefinition = { source: unknown; target: unknown };

export type ResolverDefinitions = Record<string, ResolverDefinition>;

export type ResolverKind<D extends ResolverDefinitions> = keyof D & string;

export type ResolverMap<D extends ResolverDefinitions, K extends ResolverKind<D> = ResolverKind<D>> = {
  [P in K]: Resolver<D[P]['source'], D[P]['target'] | undefined>;
};

//
// TODO(burdon): Factor out.
//

export type HasEmail = { email: string };

export type InboxResolverDefinitions = {
  contact: { source: HasEmail; target: Person.Person };
};

export const createContactResolver = async (): Resolver<HasEmail, Person.Person | undefined> => {
  const contacts = await Database.Service.runQuery(Query.select(Filter.type(Person.Person)));
  return async ({ email }) => {
    return contacts.find((contact) => contact.emails?.some((e) => e.value === email));
  };
};
