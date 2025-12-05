//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Database, Filter, Query } from '@dxos/echo';
import { Organization, Person } from '@dxos/types';

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
  [P in K]: Resolver<D[P]['source'], D[P]['target']>;
};

//
// TODO(burdon): Factor out implementation.
//

export type HasEmail = { email: string };

export const createContactResolver = Effect.gen(function* () {
  // Cache.
  const contacts = yield* Database.Service.runQuery(Query.select(Filter.type(Person.Person)));
  const resolver: Resolver<HasEmail, Person.Person> = ({ email }) => {
    return Effect.succeed(contacts.find((contact) => contact.emails?.some(({ value }) => value === email)));
  };

  return resolver;
});

export const createOrganizationResolver = Effect.gen(function* () {
  // Cache.
  const organizations = yield* Database.Service.runQuery(Query.select(Filter.type(Organization.Organization)));
  const resolver: Resolver<HasEmail, Organization.Organization> = ({ email }) => {
    const domain = extractDomain(email);
    return Effect.succeed(
      domain
        ? organizations.find((organization) => organization.website && matchesDomain(organization.website, domain))
        : undefined,
    );
  };

  return resolver;
});

//
// TODO(burdon): Factor out implementation.
//

export type InboxResolverDefinitions = {
  contact: { source: HasEmail; target: Person.Person };
  organization: { source: HasEmail; target: Organization.Organization };
};

export const createInboxResolverMap = Effect.gen(function* () {
  return {
    contact: yield* createContactResolver,
    organization: yield* createOrganizationResolver,
  } satisfies ResolverMap<InboxResolverDefinitions>;
});

//
// TODO(burdon): Factor out implementation.
//

/**
 * Checks if sub matches base (base is a subdomain of or equal to sub).
 * Example: `www.eng.example.com` matches `www.eng.example.com` and `eng.example.com` and `example.com`.
 */
export const matchesDomain = (base: string, sub: string): boolean => {
  try {
    const hostname = base.includes('://') ? new URL(base).hostname : base;
    const baseParts = hostname.toLowerCase().split('.');
    const subParts = sub.toLowerCase().split('.');
    if (subParts.length > baseParts.length) {
      return false;
    }

    // Compare parts from right to left.
    for (let i = 1; i <= subParts.length; i++) {
      if (baseParts[baseParts.length - i] !== subParts[subParts.length - i]) {
        return false;
      }
    }

    return true;
  } catch {
    return false;
  }
};

export const extractDomain = (email: string): string | undefined => {
  const match = email.match(/@(.+)/);
  return match?.[1].toLowerCase();
};
