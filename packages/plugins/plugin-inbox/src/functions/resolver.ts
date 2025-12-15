//
// Copyright 2025 DXOS.org
//

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import type * as Schema from 'effect/Schema';

import { Database, Filter, Query, Type } from '@dxos/echo';
import { Organization, Person } from '@dxos/types';

export type HasEmail = { email: string };

export type ResolverType<T, I> = (input: I) => Effect.Effect<T | undefined>;

export type ResolverMap = Record<string, ResolverType<any, any>>;

export type InboxResolverFunction<T> = (input: HasEmail) => Effect.Effect<T | undefined>;

export type InboxResolverMap = Record<string, InboxResolverFunction<any>>;

/**
 * Service for resolving objects from external data.
 */
export class Resolver extends Context.Tag('PluginInbox/Resolver')<
  Resolver,
  {
    resolve<T, I>(schema: Schema.Schema<T, any>, input: I): Effect.Effect<T | undefined>;
  }
>() {
  static resolve<T, I>(schema: Schema.Schema<T, any>, input: I) {
    return Effect.flatMap(Resolver, (service) => service.resolve(schema, input));
  }

  static fromResolvers(resolvers: ResolverMap) {
    return Layer.succeed(
      Resolver,
      Resolver.of({
        resolve: (schema, input: any) => {
          const typename = Type.getTypename(schema);
          const resolver = resolvers[typename];
          if (resolver) {
            return resolver(input);
          }

          return Effect.succeed(undefined);
        },
      }),
    );
  }
}

/**
 * Inbox specific resolver service.
 */
export class InboxResolver {
  static Live = Layer.effect(
    Resolver,
    Effect.gen(function* () {
      const personResolver = yield* createPersonResolver;
      const organizationResolver = yield* createOrganizationResolver;
      const resolvers: Record<string, InboxResolverFunction<any>> = {
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

  static Mock = (data: { people?: Person.Person[]; organizations?: Organization.Organization[] } = {}) =>
    Layer.succeed(
      Resolver,
      Resolver.of({
        resolve: (schema, input: any) => {
          const typename = Type.getTypename(schema);
          if (typename === Type.getTypename(Person.Person)) {
            const person = data.people?.find((p) =>
              p.emails?.some((e) => e.value === input.email || e.value === input),
            );
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
}

export const createOrganizationResolver = Effect.gen(function* () {
  // Cache.
  const organizations = yield* Database.Service.runQuery(Query.select(Filter.type(Organization.Organization)));
  const resolver: InboxResolverFunction<Organization.Organization> = ({ email }: HasEmail) => {
    const domain = extractDomain(email);
    return Effect.succeed(
      domain
        ? organizations.find((organization) => organization.website && matchesDomain(organization.website, domain))
        : undefined,
    );
  };

  return resolver;
});

export const createPersonResolver = Effect.gen(function* () {
  // Cache.
  const contacts = yield* Database.Service.runQuery(Query.select(Filter.type(Person.Person)));
  const resolver: InboxResolverFunction<Person.Person> = ({ email }: HasEmail) => {
    return Effect.succeed(contacts.find((contact) => contact.emails?.some(({ value }) => value === email)));
  };

  return resolver;
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
