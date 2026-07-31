//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { type Database, Filter, Obj, Ref } from '@dxos/echo';
import { log } from '@dxos/log';
import { type Actor, Organization, Person } from '@dxos/types';

import { matchesDomain } from './domain';

/**
 * Run-scoped lookup cache for {@link buildContactFromActor}. Seeded once (instead of querying the
 * space per call) and maintained by the builder as it creates contacts, so bulk extraction over many
 * messages is O(1) per message rather than O(#contacts + #orgs) per message (an O(n²) scan otherwise —
 * the dominant cost of a large mail sync). Callers that extract a single contact can omit it.
 */
export type ContactLookup = {
  /** Lowercased emails of Persons already known; the builder adds each contact it creates. */
  readonly knownEmails: Set<string>;
  /** Organizations to match a new contact's email domain against (seeded once at run start). */
  readonly organizations: readonly Organization.Organization[];
};

/**
 * Builds the {@link ContactLookup} for a run by querying the space once. Do this once per bulk
 * extraction and pass the result to every {@link buildContactFromActor} call.
 */
export const buildContactLookup = (db: Database.Database): Effect.Effect<ContactLookup> =>
  Effect.gen(function* () {
    const contacts = yield* Effect.promise(() => db.query(Filter.type(Person.Person)).run());
    const organizations = yield* Effect.promise(() => db.query(Filter.type(Organization.Organization)).run());
    const knownEmails = new Set(
      contacts.flatMap((contact) =>
        (contact.emails ?? [])
          .map((email) => email.value?.trim().toLowerCase())
          .filter((value): value is string => !!value),
      ),
    );
    return { knownEmails, organizations };
  });

/**
 * Shared contact-creation logic.
 *
 * Builds a fresh Person from the actor (no `db.add` here — caller decides whether to add directly
 * or route through an operation so the visibility/hidden flag can differ per caller).
 * Returns `undefined` when the actor has no email, or when a Person with that email already
 * exists in the space.
 *
 * Pass a {@link ContactLookup} (via {@link buildContactLookup}) for bulk extraction to avoid the
 * per-call space queries; omit it for a one-off, which falls back to querying the space.
 */
export const buildContactFromActor = (
  actor: Actor.Actor,
  db: Database.Database,
  lookup?: ContactLookup,
): Effect.Effect<Person.Person | undefined> =>
  Effect.gen(function* () {
    const email = actor.email?.trim().toLowerCase();
    if (!email) {
      log.warn('email is required for contact extraction');
      return undefined;
    }

    const exists = lookup
      ? lookup.knownEmails.has(email)
      : (yield* Effect.promise(() => db.query(Filter.type(Person.Person)).run())).some((contact) =>
          contact.emails?.some((contactEmail) => contactEmail.value?.trim().toLowerCase() === email),
        );
    if (exists) {
      return undefined;
    }

    const newContact = Obj.make(Person.Person, {
      emails: [{ value: email }],
    });
    if (actor.name) {
      Obj.update(newContact, (newContact) => {
        newContact.fullName = actor.name;
      });
    }
    // Record so a repeat sender within the same run isn't created twice (the caller adds to the db
    // after the pipeline, so a fresh query wouldn't see it yet).
    lookup?.knownEmails.add(email);

    const emailDomain = email.split('@')[1]?.toLowerCase();
    if (!emailDomain) {
      return newContact;
    }

    const organizations =
      lookup?.organizations ?? (yield* Effect.promise(() => db.query(Filter.type(Organization.Organization)).run()));
    const matchingOrg = organizations.find((org) => matchesDomain(org.website, emailDomain));
    if (matchingOrg) {
      Obj.update(newContact, (newContact) => {
        newContact.organization = Ref.make(matchingOrg);
      });
    }

    return newContact;
  });
