//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { type Database, Filter, Obj, Ref } from '@dxos/echo';
import { log } from '@dxos/log';
import { type Actor, Organization, Person } from '@dxos/types';

/**
 * Shared contact-creation logic used by both:
 *  - the ExtractContact operation (actor-targeted; invoked from the message-header avatar button)
 *  - ContactMessageExtractor (whole-message; runs through ExtractMessage like any other extractor).
 *
 * Builds a fresh Person from the actor (no `db.add` here — caller decides whether to add directly
 * or route through SpaceOperation.AddObject so the visibility/hidden flag can differ per caller).
 * Returns `undefined` when the actor has no email, or when a Person with that email already
 * exists in the space.
 */
export const buildContactFromActor = (
  actor: Actor.Actor,
  db: Database.Database,
): Effect.Effect<Person.Person | undefined> =>
  Effect.gen(function* () {
    const email = actor.email;
    if (!email) {
      log.warn('email is required for contact extraction', { actor });
      return undefined;
    }

    const existingContacts = yield* Effect.promise(() => db.query(Filter.type(Person.Person)).run());
    const existingContact = existingContacts.find((contact) =>
      contact.emails?.some((contactEmail) => contactEmail.value === email),
    );
    if (existingContact) {
      log.info('contact already exists', { email, existingContact });
      return undefined;
    }

    const newContact = Obj.make(Person.Person, {
      emails: [{ value: email }],
    });
    if (actor.name) {
      Obj.update(newContact, (contact) => {
        contact.fullName = actor.name;
      });
    }

    const emailDomain = email.split('@')[1]?.toLowerCase();
    if (!emailDomain) {
      return newContact;
    }

    const existingOrganizations = yield* Effect.promise(() => db.query(Filter.type(Organization.Organization)).run());
    const matchingOrg = existingOrganizations.find((org) => matchesDomain(org.website, emailDomain));
    if (matchingOrg) {
      Obj.update(newContact, (contact) => {
        contact.organization = Ref.make(matchingOrg);
      });
    }

    return newContact;
  });

const matchesDomain = (website: string | undefined, emailDomain: string): boolean => {
  if (!website) {
    return false;
  }
  try {
    const url = website.startsWith('http://') || website.startsWith('https://') ? website : `https://${website}`;
    const websiteDomain = new URL(url).hostname.toLowerCase();
    return (
      websiteDomain === emailDomain ||
      websiteDomain.endsWith(`.${emailDomain}`) ||
      emailDomain.endsWith(`.${websiteDomain}`)
    );
  } catch (err) {
    log.warn('parsing website URL', { website, error: err });
    return false;
  }
};
