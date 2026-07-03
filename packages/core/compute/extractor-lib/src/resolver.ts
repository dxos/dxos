//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { Database, Filter, Query, Type } from '@dxos/echo';
import { Resolver } from '@dxos/extractor';
import { Organization, Person } from '@dxos/types';

import { extractDomain, matchesDomain } from './domain';

export type HasEmail = { email: string };

export type ResolverFunction<T> = (input: HasEmail) => Effect.Effect<T | undefined>;

export type ResolverMap = Record<string, ResolverFunction<any>>;

/**
 * Resolves an existing Organization from a sender email by matching its domain against known
 * Organization websites. Queries the space once and caches the result.
 */
export const createOrganizationResolver = Effect.gen(function* () {
  const organizations = yield* Database.query(Query.select(Filter.type(Organization.Organization))).run;
  const resolver: ResolverFunction<Organization.Organization> = ({ email }: HasEmail) => {
    const domain = extractDomain(email);
    return Effect.succeed(
      domain
        ? organizations.find((organization) => organization.website && matchesDomain(organization.website, domain))
        : undefined,
    );
  };

  return resolver;
});

/**
 * Resolves an existing Person from a sender email by matching one of its email addresses. Queries
 * the space once and caches the result.
 */
export const createPersonResolver = Effect.gen(function* () {
  const contacts = yield* Database.query(Query.select(Filter.type(Person.Person))).run;
  const resolver: ResolverFunction<Person.Person> = ({ email }: HasEmail) => {
    return Effect.succeed(contacts.find((contact) => contact.emails?.some(({ value }) => value === email)));
  };

  return resolver;
});

/**
 * Live resolver backed by the space database: resolves Person by email and Organization by
 * email domain.
 */
export const Live = Layer.effect(
  Resolver,
  Effect.gen(function* () {
    const personResolver = yield* createPersonResolver;
    const organizationResolver = yield* createOrganizationResolver;
    const resolvers: ResolverMap = {
      [Type.getTypename(Person.Person)]: personResolver,
      [Type.getTypename(Organization.Organization)]: organizationResolver,
    };

    return Resolver.of({
      resolve: (schema, input: any) => {
        const typename = Type.getTypename(schema);
        const resolver = resolvers[typename];
        if (resolver) {
          return resolver(input);
        }

        return Effect.succeed(undefined);
      },
    });
  }),
);

/** In-memory resolver over fixed Person/Organization lists (Person by email, Organization by domain). */
export const Mock = (data: { people?: Person.Person[]; organizations?: Organization.Organization[] } = {}) =>
  Layer.succeed(
    Resolver,
    Resolver.of({
      resolve: (schema, input: any) => {
        const typename = Type.getTypename(schema);
        if (typename === Type.getTypename(Person.Person)) {
          const person = data.people?.find((p) => p.emails?.some((e) => e.value === input.email || e.value === input));
          return Effect.succeed(person as any);
        } else if (typename === Type.getTypename(Organization.Organization)) {
          const domain = extractDomain(input.email);
          if (domain) {
            const org = data.organizations?.find((o) => o.website && matchesDomain(o.website, domain));
            return Effect.succeed(org as any);
          }
        }

        return Effect.succeed(undefined);
      },
    }),
  );
