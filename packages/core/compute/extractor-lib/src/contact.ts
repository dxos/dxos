//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { type Database, Filter, Obj, Ref } from '@dxos/echo';
import { log } from '@dxos/log';
import { type Actor, Organization, Person } from '@dxos/types';

import { matchesDomain } from './domain';

/**
 * Shared contact-creation logic.
 *
 * Builds a fresh Person from the actor (no `db.add` here — caller decides whether to add directly
 * or route through an operation so the visibility/hidden flag can differ per caller).
 * Returns `undefined` when the actor has no email, or when a Person with that email already
 * exists in the space.
 */
export const buildContactFromActor = (
  actor: Actor.Actor,
  db: Database.Database,
): Effect.Effect<Person.Person | undefined> =>
  Effect.gen(function* () {
    const email = actor.email?.trim().toLowerCase();
    if (!email) {
      log.warn('email is required for contact extraction');
      return undefined;
    }

    const existingContacts = yield* Effect.promise(() => db.query(Filter.type(Person.Person)).run());
    const existingContact = existingContacts.find((contact) =>
      contact.emails?.some((contactEmail) => contactEmail.value?.trim().toLowerCase() === email),
    );
    if (existingContact) {
      log.info('contact already exists for sender email');
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

    const emailDomain = email.split('@')[1]?.toLowerCase();
    if (!emailDomain) {
      return newContact;
    }

    const existingOrganizations = yield* Effect.promise(() => db.query(Filter.type(Organization.Organization)).run());
    const matchingOrg = existingOrganizations.find((org) => matchesDomain(org.website, emailDomain));
    if (matchingOrg) {
      Obj.update(newContact, (newContact) => {
        newContact.organization = Ref.make(matchingOrg);
      });
    }

    return newContact;
  });
