//
// Copyright 2026 DXOS.org
//

import type * as Effect from 'effect/Effect';

import type * as SampleSpace from '@dxos/app-toolkit/SampleSpace';
import { Ref } from '@dxos/echo';
import { type Actor, type Person } from '@dxos/types';

/** The Alien Labs template's reference date, a Wednesday. Partials read it through `SampleSpace.Clock`. */
export const REFERENCE = '2026-10-14T16:00:00Z';

/** What a partial's builder functions return; named so exported builders have a nameable type. */
export type Make<A> = Effect.Effect<A, SampleSpace.SampleSpaceError, SampleSpace.Services>;

/** An Actor for a person in the space: name and email for display, the contact ref for navigation. */
export const personActor = (person: Person.Person): Actor.Actor => ({
  role: 'user',
  name: person.fullName,
  email: person.emails?.[0]?.value,
  contact: Ref.make(person),
});
