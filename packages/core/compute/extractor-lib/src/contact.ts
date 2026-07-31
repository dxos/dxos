//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { type Database, Obj, Ref } from '@dxos/echo';
import { type IdentityIndex } from '@dxos/extractor';
import { log } from '@dxos/log';
import { type Actor, Organization, Person } from '@dxos/types';

import { normalizeEmail } from './identity';
import { getIdentityIndex } from './resolver';
import { type SenderSignals, shouldExtractContact } from './selection';

export type BuildContactOptions = {
  /** Message signals feeding the extraction gate; omit when the caller has already decided. */
  readonly signals?: SenderSignals;
  /**
   * Index to resolve and register against. Pass a run-scoped overlay
   * (`overlayIdentityIndex`) so contacts this run builds but never commits do not persist into the
   * space's shared index. Defaults to the shared index.
   */
  readonly index?: IdentityIndex;
};

/**
 * Shared contact-creation logic.
 *
 * Builds a fresh Person from the actor (no `db.add` here — caller decides whether to add directly
 * or route through an operation so the visibility/hidden flag can differ per caller).
 * Returns `undefined` when the actor has no email, or when a Person with that email already exists.
 *
 * Existence is answered by the space's shared identity index, so bulk extraction costs one query
 * per type for the whole run rather than a scan per message, and — because the index is shared and
 * the new contact is registered into it — a repeat sender never yields a second Person, whether the
 * repeat is later in this run or concurrent in another.
 */
export const buildContactFromActor = (
  actor: Actor.Actor,
  db: Database.Database,
  { signals, index: provided }: BuildContactOptions = {},
): Effect.Effect<Person.Person | undefined> =>
  Effect.gen(function* () {
    const email = normalizeEmail(actor.email);
    if (!email) {
      log.warn('email is required for contact extraction');
      return undefined;
    }

    // The shared index is read-only here: registering an uncommitted contact into it would make
    // every later lookup resolve to an object the space may never receive (see `overlayIdentityIndex`).
    // A caller that wants in-run dedup passes its own overlay.
    const index = provided ?? (yield* getIdentityIndex(db));
    if (index.lookup(Person.Person, { email })) {
      return undefined;
    }

    // Only gate when the caller supplies signals: a caller with no message context (an explicit
    // "add this contact" action) has already made the decision.
    if (signals && !shouldExtractContact(email, signals, index)) {
      return undefined;
    }

    const contact = Obj.make(Person.Person, { emails: [{ value: email }] });
    if (actor.name) {
      Obj.update(contact, (contact) => {
        contact.fullName = actor.name;
      });
    }

    // Only into a caller-owned overlay: the next message from the same sender must not build a
    // second contact, but a run that dies before committing must not leave the space's shared index
    // claiming one either.
    provided?.register(contact);

    const organization = index.lookup(Organization.Organization, { email });
    if (organization) {
      Obj.update(contact, (contact) => {
        contact.organization = Ref.make(organization);
      });
    }

    return contact;
  });
