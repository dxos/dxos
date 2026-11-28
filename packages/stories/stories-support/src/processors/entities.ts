//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Obj } from '@dxos/echo';
import { buildContactGraph, getIdentityIndex } from '@dxos/extractor-lib';
import { Organization, Person } from '@dxos/types';

import { type EntityExtractor } from '../contracts/index.ts';
import { type SupportCapabilities } from '../plugins/index.ts';

const label = (object: Obj.Unknown): string => Obj.getLabel(object) ?? object.id;

/**
 * Matches a sender against the space's people and organizations by the shared identity rules (a Person by email, an
 * Organization by the address's domain), creating whichever is missing and linking the Person to the Organization.
 */
export const makeEntityExtractor = ({ db }: SupportCapabilities.Host): EntityExtractor.Implementation => ({
  extract: ({ sender }) =>
    Effect.gen(function* () {
      // Re-seeded on every call so a Person or Organization an earlier message created is matched, not made twice.
      const index = yield* getIdentityIndex(db, { refresh: true });
      const knownPerson = index.lookup(Person.Person, { email: sender.email });
      const knownOrganization = index.lookup(Organization.Organization, { email: sender.email });

      const { contact, organization } = yield* buildContactGraph({ email: sender.email, name: sender.name }, db);
      const created = [organization, contact].filter((object) => object !== undefined);
      for (const object of created) {
        db.add(object);
      }
      if (created.length > 0) {
        // Indexed now, so the next message from the same sender or organization matches what this one made.
        yield* Effect.promise(() => db.flush({ indexes: true }));
      }

      const person = contact ?? knownPerson;
      const employer = organization ?? knownOrganization;
      const matched = [contact ? undefined : knownPerson, organization ? undefined : knownOrganization].filter(
        (object) => object !== undefined,
      );
      return {
        person: person && Obj.getURI(person),
        organization: employer && Obj.getURI(employer),
        created: created.map(label),
        matched: matched.map(label),
      };
    }),
});
